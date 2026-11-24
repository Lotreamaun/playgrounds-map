import { SlidersHorizontal } from '@phosphor-icons/react'

export const FILTER_PANEL_ID = 'filter-panel'

interface FilterButtonProps {
  count: number
  expanded: boolean
  onClick: () => void
  /** `floating`: round button over the map; `inline`: in a header, next to the search field. */
  variant: 'floating' | 'inline'
}

function FilterButton({ count, expanded, onClick, variant }: FilterButtonProps) {
  return (
    <button
      type="button"
      className={`filter-button filter-button--${variant}${count > 0 ? ' filter-button--active' : ''}`}
      data-filter-trigger=""
      aria-label={count > 0 ? `Фильтры, включено: ${count}` : 'Фильтры'}
      aria-expanded={expanded}
      aria-controls={expanded ? FILTER_PANEL_ID : undefined}
      onClick={onClick}
    >
      <SlidersHorizontal size={22} aria-hidden="true" />
      {count > 0 && (
        <span className="filter-button__badge" aria-hidden="true">
          {count}
        </span>
      )}
    </button>
  )
}

export default FilterButton
