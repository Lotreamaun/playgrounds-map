import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft } from '@phosphor-icons/react'
import MapView from './components/MapView'
import CourtForm from './components/CourtForm'
import CourtList from './components/CourtList'
import CourtCard from './components/CourtCard'
import CardSheet from './components/CardSheet'
import FullScreenLayer from './components/FullScreenLayer'
import SearchScreen from './components/SearchScreen'
import SearchField from './components/SearchField'
import SidePanel from './components/SidePanel'
import Toast from './components/Toast'
import type { Coordinates } from './components/CourtForm'
import type { Court } from './services/api'
import { useMediaQuery } from './hooks/useMediaQuery'
import { useCourts } from './hooks/useCourts'
import { useGeolocation, requestGeolocation } from './hooks/useGeolocation'
import { useCourtUrl } from './hooks/useCourtUrl'
import { useEscape } from './hooks/useEscape'
import { showToast } from './hooks/useToast'
import { distanceHaversine } from './utils/distance'
import { filterCourts, sortCourts } from './utils/search'

type Ui =
  | { kind: 'browse' }
  | { kind: 'search' }
  | { kind: 'card'; courtId: number }
  | { kind: 'form'; picking: boolean }

const BROWSE: Ui = { kind: 'browse' }

function App() {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const { status, courts, retry, add, byId } = useCourts()
  const geo = useGeolocation()
  const position = geo.position

  const [ui, setUi] = useState<Ui>(BROWSE)
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [pick, setPick] = useState<Coordinates | null>(null)
  const [sheetHeight, setSheetHeight] = useState(0)

  const pickRef = useRef(pick)
  const addSessionRef = useRef(0)
  useEffect(() => {
    pickRef.current = pick
  })

  // Distances are computed once per (courts, position) and shared by list and card.
  const distances = useMemo<ReadonlyMap<number, number> | null>(() => {
    if (position == null) return null
    const map = new Map<number, number>()
    for (const c of courts) {
      if (c.id != null) map.set(c.id, distanceHaversine(position.lat, position.lon, c.latitude, c.longitude))
    }
    return map
  }, [courts, position])

  const sortedCourts = useMemo(() => sortCourts(courts, position), [courts, position])
  const visibleCourts = useMemo(() => filterCourts(sortedCourts, deferredQuery), [sortedCourts, deferredQuery])

  const selectedId = ui.kind === 'card' ? ui.courtId : null
  const selectedCourt: Court | null = selectedId != null ? (byId(selectedId) ?? null) : null
  const addMode = ui.kind === 'form'
  const picking = ui.kind === 'form' && ui.picking

  const selectCourt = useCallback((id: number) => setUi({ kind: 'card', courtId: id }), [])
  const closeCard = useCallback(() => setUi((u) => (u.kind === 'card' ? BROWSE : u)), [])
  const openSearch = useCallback(() => setUi({ kind: 'search' }), [])
  const closeSearch = useCallback(() => setUi((u) => (u.kind === 'search' ? BROWSE : u)), [])

  useCourtUrl({
    selectedId,
    ready: status === 'ready',
    exists: useCallback((id: number) => byId(id) != null, [byId]),
    onOpen: selectCourt,
  })

  const startAdd = useCallback(() => {
    const session = ++addSessionRef.current
    setPick(null)
    setUi({ kind: 'form', picking: false })
    // Shared location: reuse a known fix right away, otherwise ask once in the background.
    const known = position
    if (known != null) {
      setPick({ latitude: known.lat, longitude: known.lon })
      return
    }
    void requestGeolocation().then((state) => {
      if (session !== addSessionRef.current || pickRef.current != null || state.position == null) return
      setPick({ latitude: state.position.lat, longitude: state.position.lon })
    })
  }, [position])

  const cancelAdd = useCallback(() => {
    addSessionRef.current += 1
    setPick(null)
    setUi((u) => (u.kind === 'form' ? BROWSE : u))
  }, [])

  const handleMapClick = useCallback((latitude: number, longitude: number) => {
    addSessionRef.current += 1
    setPick({ latitude, longitude })
    setUi((u) => (u.kind === 'form' ? { kind: 'form', picking: false } : u))
  }, [])

  const handlePickOnMap = useCallback(() => setUi({ kind: 'form', picking: true }), [])

  const handleCreated = useCallback(
    (court: Court) => {
      add(court)
      addSessionRef.current += 1
      setPick(null)
      setUi(court.id != null ? { kind: 'card', courtId: court.id } : BROWSE)
      showToast('Площадка добавлена')
    },
    [add],
  )

  const handleEmptyTap = useCallback(() => {
    if (isMobile) closeCard()
  }, [isMobile, closeCard])

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value)
      // Typing on desktop while a card is shown goes back to the results list.
      closeCard()
    },
    [closeCard],
  )

  useEscape(!isMobile && ui.kind === 'card', closeCard)

  const locating = pick == null && geo.status === 'locating'
  const locationFailed = pick == null && (geo.status === 'denied' || geo.status === 'unavailable')

  const listProps = {
    courts: visibleCourts,
    totalCount: courts.length,
    status,
    distances,
    onSelect: selectCourt,
    onRetry: retry,
    onAdd: startAdd,
  }

  const form = (
    <CourtForm
      coordinates={pick}
      locating={locating}
      locationFailed={locationFailed}
      onPickOnMap={isMobile ? handlePickOnMap : undefined}
      onCreated={handleCreated}
      onCancel={cancelAdd}
    />
  )

  const toastBottom = isMobile
    ? selectedCourt != null
      ? `${sheetHeight + 16}px`
      : 'calc(env(safe-area-inset-bottom, 0px) + 72px)'
    : '32px'

  return (
    <>
      <div className="app-shell">
        {!isMobile && (
          <SidePanel query={query} onQueryChange={handleQueryChange} onAdd={startAdd}>
            {/* Kept mounted (hidden) while a card or form is shown, so scroll position persists. */}
            <div
              className="side-panel__pane side-panel__list"
              hidden={ui.kind === 'card' || ui.kind === 'form'}
            >
              <CourtList {...listProps} />
            </div>

            {selectedCourt != null && (
              <div key={selectedCourt.id} className="side-panel__pane side-panel__card">
                <button type="button" className="btn btn-ghost side-panel__back" onClick={closeCard}>
                  <ArrowLeft size={18} aria-hidden="true" />К списку
                </button>
                <CourtCard
                  court={selectedCourt}
                  layout="panel"
                  distanceKm={selectedCourt.id != null ? (distances?.get(selectedCourt.id) ?? null) : null}
                />
              </div>
            )}

            {ui.kind === 'form' && <div className="side-panel__pane side-panel__form">{form}</div>}
          </SidePanel>
        )}

        <MapView
          courts={courts}
          position={position}
          selectedCourt={selectedCourt}
          addMode={addMode}
          pick={pick}
          isMobile={isMobile}
          sheetHeight={sheetHeight}
          controlsHidden={isMobile && (selectedCourt != null || picking)}
          onMapClick={handleMapClick}
          onSelectCourt={selectCourt}
          onEmptyTap={handleEmptyTap}
          onAdd={startAdd}
        />
      </div>

      {isMobile && (
        <>
          {!picking && ui.kind !== 'form' && (
            <div className="mobile-search">
              <SearchField
                variant="float"
                mode="trigger"
                value={query}
                onChange={setQuery}
                onTrigger={openSearch}
              />
            </div>
          )}

          {ui.kind === 'search' && (
            <SearchScreen query={query} onQueryChange={setQuery} onBack={closeSearch} list={listProps} />
          )}

          {selectedCourt != null && (
            <CardSheet
              label="Карточка площадки"
              resetKey={selectedCourt.id ?? 0}
              onClose={closeCard}
              onHeightChange={setSheetHeight}
            >
              <CourtCard
                court={selectedCourt}
                layout="sheet"
                distanceKm={selectedCourt.id != null ? (distances?.get(selectedCourt.id) ?? null) : null}
              />
            </CardSheet>
          )}

          {/* Stays mounted while picking a point: keeps the form's input and its history entry. */}
          {ui.kind === 'form' && (
            <FullScreenLayer label="Добавить площадку" onClose={cancelAdd} hidden={picking}>
              {form}
            </FullScreenLayer>
          )}

          {picking && (
            <div className="pick-hint">
              <p className="pick-hint__text">Нажмите на карту, чтобы выбрать точку</p>
              <button type="button" className="btn btn-secondary pick-hint__cancel" onClick={cancelAdd}>
                Отмена
              </button>
            </div>
          )}
        </>
      )}

      <Toast bottom={toastBottom} />
    </>
  )
}

export default App
