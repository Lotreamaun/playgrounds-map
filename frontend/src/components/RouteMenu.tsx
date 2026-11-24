import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ArrowSquareOut, CaretDown, NavigationArrow } from '@phosphor-icons/react'
import { routeLinks } from '../utils/route'
import { useEscape } from '../hooks/useEscape'

interface RouteMenuProps {
  latitude: number
  longitude: number
  layout: 'panel' | 'sheet'
}

function RouteMenu({ latitude, longitude, layout }: RouteMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const links = useMemo(() => routeLinks(latitude, longitude), [latitude, longitude])

  useEscape(open, () => setOpen(false))

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current != null && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  return (
    <div ref={rootRef} className={`route-menu route-menu--${layout}`}>
      <button
        type="button"
        className="btn btn-primary route-menu__toggle"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((prev) => !prev)}
      >
        <NavigationArrow weight="fill" size={18} aria-hidden="true" />
        Маршрут
        <CaretDown
          size={14}
          weight="bold"
          aria-hidden="true"
          className={`route-menu__caret${open ? ' route-menu__caret--open' : ''}`}
        />
      </button>
      {open && (
        <ul id={listId} className="route-menu__list">
          {links.map((link) => (
            <li key={link.id}>
              <a
                className="route-menu__item"
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
              >
                {link.label}
                <ArrowSquareOut size={16} aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default RouteMenu
