import type { Ref } from 'react'
import { MagnifyingGlass, X } from '@phosphor-icons/react'

interface SearchFieldProps {
  value: string
  onChange: (value: string) => void
  /** `trigger`: read-only field that opens the search screen on tap (mobile map). */
  mode?: 'input' | 'trigger'
  onTrigger?: () => void
  variant?: 'flat' | 'float'
  inputRef?: Ref<HTMLInputElement>
  placeholder?: string
}

function SearchField({
  value,
  onChange,
  mode = 'input',
  onTrigger,
  variant = 'flat',
  inputRef,
  placeholder = 'Поиск площадки',
}: SearchFieldProps) {
  const isTrigger = mode === 'trigger'
  return (
    <div className={`search-field search-field--${variant}`}>
      <MagnifyingGlass className="search-field__icon" size={20} aria-hidden="true" />
      <input
        ref={inputRef}
        className="search-field__input"
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label="Поиск площадки по названию или адресу"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
        readOnly={isTrigger}
        onChange={(e) => onChange(e.target.value)}
        onClick={isTrigger ? onTrigger : undefined}
        onKeyDown={
          isTrigger
            ? (e) => {
                if (e.key === 'Enter') onTrigger?.()
              }
            : undefined
        }
      />
      {value !== '' && (
        <button
          type="button"
          className="search-field__clear"
          aria-label="Очистить поиск"
          onClick={() => onChange('')}
        >
          <X size={14} weight="bold" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

export default SearchField
