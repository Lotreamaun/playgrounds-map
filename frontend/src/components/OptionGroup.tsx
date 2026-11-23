import { useRef } from 'react'
import type { KeyboardEvent } from 'react'

export interface Option {
  value: string
  label: string
}

interface OptionGroupProps {
  id: string
  label: string
  options: Option[]
  value: string
  onChange: (value: string) => void
}

/** Single-choice radiogroup of tappable buttons (roving tabindex, arrow-key navigation). */
function OptionGroup({ id, label, options, value, onChange }: OptionGroupProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([])
  const labelId = `${id}-label`
  const selectedIndex = options.findIndex((o) => o.value === value)

  const move = (index: number) => {
    const next = (index + options.length) % options.length
    onChange(options[next].value)
    refs.current[next]?.focus()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault()
        move(index + 1)
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault()
        move(index - 1)
        break
      case 'Home':
        event.preventDefault()
        move(0)
        break
      case 'End':
        event.preventDefault()
        move(options.length - 1)
        break
    }
  }

  return (
    <div className="option-group-field">
      <span id={labelId} className="form-label">
        {label}
      </span>
      <div className="option-group" role="radiogroup" aria-labelledby={labelId}>
        {options.map((option, index) => {
          const checked = option.value === value
          return (
            <button
              key={option.value}
              ref={(el) => {
                refs.current[index] = el
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked || (selectedIndex === -1 && index === 0) ? 0 : -1}
              className={`option-group__option${checked ? ' option-group__option--checked' : ''}`}
              onClick={() => onChange(option.value)}
              onKeyDown={(e) => handleKeyDown(e, index)}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default OptionGroup
