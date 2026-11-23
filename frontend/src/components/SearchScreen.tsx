import { useEffect, useRef } from 'react'
import { ArrowLeft } from '@phosphor-icons/react'
import FullScreenLayer from './FullScreenLayer'
import SearchField from './SearchField'
import CourtList from './CourtList'
import type { ComponentProps } from 'react'

interface SearchScreenProps {
  query: string
  onQueryChange: (value: string) => void
  onBack: () => void
  list: ComponentProps<typeof CourtList>
}

function SearchScreen({ query, onQueryChange, onBack, list }: SearchScreenProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <FullScreenLayer label="Поиск площадок" onClose={onBack}>
      <header className="search-screen__header">
        <button type="button" className="icon-btn" aria-label="Назад к карте" onClick={onBack}>
          <ArrowLeft size={22} aria-hidden="true" />
        </button>
        <SearchField value={query} onChange={onQueryChange} inputRef={inputRef} />
      </header>
      <div className="search-screen__content">
        <CourtList {...list} />
      </div>
    </FullScreenLayer>
  )
}

export default SearchScreen
