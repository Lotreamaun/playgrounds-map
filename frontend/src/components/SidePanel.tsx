import type { ReactNode } from 'react'
import { Plus } from '@phosphor-icons/react'
import SearchField from './SearchField'

interface SidePanelProps {
  query: string
  onQueryChange: (value: string) => void
  onAdd: () => void
  children: ReactNode
}

function SidePanel({ query, onQueryChange, onAdd, children }: SidePanelProps) {
  return (
    <aside className="side-panel" aria-label="Площадки">
      <header className="side-panel__header">
        <div className="side-panel__top">
          <span className="side-panel__brand">CourtMap</span>
          <button type="button" className="btn btn-secondary side-panel__add" onClick={onAdd}>
            <Plus size={16} weight="bold" aria-hidden="true" />
            Добавить
          </button>
        </div>
        <SearchField value={query} onChange={onQueryChange} />
      </header>
      <div className="side-panel__content">{children}</div>
    </aside>
  )
}

export default SidePanel
