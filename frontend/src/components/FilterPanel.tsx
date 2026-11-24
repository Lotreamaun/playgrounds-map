import { useEffect, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { Check, House } from '@phosphor-icons/react'
import LightIcon from './LightIcon'
import OptionGroup from './OptionGroup'
import { FILTER_PANEL_ID } from './FilterButton'
import { useEscape } from '../hooks/useEscape'
import { useHistoryLayer } from '../hooks/useHistoryLayer'
import { activeFilterCount } from '../utils/filters'
import type { ConditionFilter, CourtFilters } from '../utils/filters'
import { translateSurface } from '../utils/labels'

const DISMISS_DISTANCE_PX = 80
const DISMISS_VELOCITY_PX_MS = 0.5
const DISMISS_ANIMATION_MS = 180

const CONDITION_OPTIONS: Array<{ value: ConditionFilter; label: string }> = [
  { value: 'any', label: 'Любое' },
  { value: 'good', label: 'От хорошего' },
  { value: 'excellent', label: 'Отличное' },
]

interface FilterPanelProps {
  filters: CourtFilters
  /** Surfaces present in the data; the group is hidden when empty. */
  surfaces: string[]
  /** Courts passing the filters (shown in the mobile "Показать" button). */
  matchCount: number
  onChange: (filters: CourtFilters) => void
  onReset: () => void
  onClose: () => void
  /** `sheet`: mobile bottom sheet; `dropdown`: desktop panel under the side-panel header. */
  variant: 'sheet' | 'dropdown'
}

/** "площадку / площадки / площадок" for the count. */
function showLabel(count: number): string {
  const mod100 = count % 100
  const mod10 = count % 10
  let noun = 'площадок'
  if (mod100 < 11 || mod100 > 14) {
    if (mod10 === 1) noun = 'площадку'
    else if (mod10 >= 2 && mod10 <= 4) noun = 'площадки'
  }
  return `Показать ${count} ${noun}`
}

/** Returns focus to what was focused before opening, unless the user already moved it elsewhere. */
function useRestoreFocus() {
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    return () => {
      const active = document.activeElement
      if (previous != null && previous.isConnected && (active == null || active === document.body)) {
        previous.focus()
      }
    }
  }, [])
}

function FilterHead({ filters, onReset }: Pick<FilterPanelProps, 'filters' | 'onReset'>) {
  return (
    <div className="filter-panel__title-row">
      <h2 className="filter-panel__title">Фильтры</h2>
      <button
        type="button"
        className="filter-panel__reset"
        disabled={activeFilterCount(filters) === 0}
        onClick={onReset}
      >
        Сбросить
      </button>
    </div>
  )
}

function FilterGroups({ filters, surfaces, onChange }: Pick<FilterPanelProps, 'filters' | 'surfaces' | 'onChange'>) {
  const toggleSurface = (surface: string) => {
    const next = filters.surfaces.includes(surface)
      ? filters.surfaces.filter((s) => s !== surface)
      : [...filters.surfaces, surface]
    onChange({ ...filters, surfaces: next })
  }

  const toggle = (key: 'lit' | 'covered', label: string, icon: ReactNode) => (
    <button
      type="button"
      className="filter-toggle"
      aria-pressed={filters[key]}
      onClick={() => onChange({ ...filters, [key]: !filters[key] })}
    >
      {icon}
      {label}
      {filters[key] && <Check size={16} weight="bold" aria-hidden="true" />}
    </button>
  )

  return (
    <div className="filter-panel__groups">
        <OptionGroup
          id="filter-condition"
          label="Состояние"
          variant="segmented"
          options={CONDITION_OPTIONS}
          value={filters.condition}
          onChange={(value) => onChange({ ...filters, condition: value as ConditionFilter })}
        />
        <div className="option-group-field">
          <span className="form-label">Удобства</span>
          <div className="filter-panel__chips" role="group" aria-label="Удобства">
            {toggle('lit', 'Со светом', <LightIcon on size={18} />)}
            {toggle('covered', 'Крытая', <House size={18} aria-hidden="true" />)}
          </div>
        </div>
        {surfaces.length > 0 && (
          <div className="option-group-field">
            <span className="form-label">Покрытие</span>
            <div className="filter-panel__chips" role="group" aria-label="Покрытие">
              {surfaces.map((surface) => {
                const on = filters.surfaces.includes(surface)
                return (
                  <button
                    key={surface}
                    type="button"
                    className="filter-toggle"
                    aria-pressed={on}
                    onClick={() => toggleSurface(surface)}
                  >
                    {translateSurface(surface)}
                    {on && <Check size={16} weight="bold" aria-hidden="true" />}
                  </button>
                )
              })}
            </div>
          </div>
        )}
    </div>
  )
}

function FilterDropdown(props: FilterPanelProps) {
  useEscape(true, props.onClose)
  useRestoreFocus()
  return (
    <section id={FILTER_PANEL_ID} className="filter-panel filter-panel--dropdown" aria-label="Фильтры">
      <FilterHead {...props} />
      <FilterGroups {...props} />
    </section>
  )
}

/**
 * Non-modal bottom sheet (no overlay, the map stays interactive). Swipe down on the header,
 * a tap outside, Escape and the system "back" close it; changes apply to the data immediately.
 */
function FilterSheet(props: FilterPanelProps) {
  const { matchCount, onClose } = props
  const sheetRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ startY: number; startTime: number; dy: number } | null>(null)
  const closing = useRef(false)

  useEscape(true, onClose)
  useHistoryLayer(onClose)
  useRestoreFocus()

  useEffect(() => {
    sheetRef.current?.focus({ preventScroll: true })
  }, [])

  // Non-modal: a tap anywhere else (map, search field) closes it. The filter button toggles itself.
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null
      if (target == null || sheetRef.current?.contains(target) || target.closest('[data-filter-trigger]') != null) return
      onClose()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [onClose])

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button') != null || closing.current) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { startY: event.clientY, startTime: performance.now(), dy: 0 }
    sheetRef.current?.classList.add('filter-sheet--dragging')
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = drag.current
    if (state == null || sheetRef.current == null) return
    state.dy = Math.max(0, event.clientY - state.startY)
    sheetRef.current.style.transform = `translateY(${state.dy}px)`
  }

  const finishDrag = (event: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const state = drag.current
    const sheet = sheetRef.current
    drag.current = null
    if (state == null || sheet == null) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    sheet.classList.remove('filter-sheet--dragging')
    const elapsed = Math.max(1, performance.now() - state.startTime)
    const fast = state.dy > 20 && state.dy / elapsed > DISMISS_VELOCITY_PX_MS
    if (!cancelled && (state.dy > DISMISS_DISTANCE_PX || fast)) {
      closing.current = true
      sheet.style.transform = 'translateY(100%)'
      window.setTimeout(onClose, DISMISS_ANIMATION_MS)
    } else {
      sheet.style.transform = ''
    }
  }

  return (
    <div
      ref={sheetRef}
      id={FILTER_PANEL_ID}
      className="filter-sheet"
      role="dialog"
      aria-label="Фильтры"
      tabIndex={-1}
    >
      <div
        className="filter-sheet__grip"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(e) => finishDrag(e, false)}
        onPointerCancel={(e) => finishDrag(e, true)}
      >
        <span className="filter-sheet__handle" aria-hidden="true" />
        <FilterHead {...props} />
      </div>
      <div className="filter-sheet__body">
        <FilterGroups {...props} />
      </div>
      <div className="filter-sheet__footer">
        <button
          type="button"
          className="btn btn-primary filter-sheet__show"
          disabled={matchCount === 0}
          aria-live="polite"
          onClick={onClose}
        >
          {matchCount === 0 ? 'Ничего не найдено' : showLabel(matchCount)}
        </button>
      </div>
    </div>
  )
}

function FilterPanel(props: FilterPanelProps) {
  return props.variant === 'sheet' ? <FilterSheet {...props} /> : <FilterDropdown {...props} />
}

export default FilterPanel
