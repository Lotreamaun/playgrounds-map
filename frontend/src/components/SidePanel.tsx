import type { ReactNode } from 'react'

interface SidePanelProps {
  open: boolean
  children: ReactNode
}

function SidePanel({ open, children }: SidePanelProps) {
  return (
    <div className={`side-panel${open ? ' side-panel--open' : ''}`}>
      <div className="side-panel__content">{children}</div>
    </div>
  )
}

export default SidePanel
