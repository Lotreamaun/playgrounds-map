import { useCallback, useEffect, useState } from 'react'
import MapView from './components/MapView'
import CourtForm from './components/CourtForm'
import CourtList from './components/CourtList'
import BottomSheet from './components/BottomSheet'
import { CourtCard } from './components/CourtMarker'
import type { Coordinates } from './components/CourtForm'
import { getCourts } from './services/api'
import type { Court } from './services/api'
import { useMediaQuery } from './hooks/useMediaQuery'

type SheetState = { type: 'none' } | { type: 'card'; court: Court } | { type: 'list' }

function App() {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const [courts, setCourts] = useState<Court[]>([])
  const [addMode, setAddMode] = useState(false)
  const [pick, setPick] = useState<Coordinates | null>(null)
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null)
  const [view, setView] = useState<'map' | 'list'>('map')
  const [sheet, setSheet] = useState<SheetState>({ type: 'none' })
  const [listCourts, setListCourts] = useState<Court[]>([])
  const [allCourtsLoaded, setAllCourtsLoaded] = useState(false)

  useEffect(() => {
    if (allCourtsLoaded) return
    const needsFullList = isMobile || (!isMobile && view === 'list')
    if (!needsFullList) return
    getCourts()
      .then((all) => {
        setListCourts(all)
        setAllCourtsLoaded(true)
      })
      .catch((err) => {
        console.error('Failed to fetch all courts:', err)
      })
  }, [isMobile, view, allCourtsLoaded])

  const handleMapClick = useCallback((latitude: number, longitude: number) => {
    setPick({ latitude, longitude })
  }, [])

  const handleCreated = useCallback((court: Court) => {
    setCourts((prev) => [...prev.filter((c) => c.id !== court.id), court])
    setAddMode(false)
    setPick(null)
  }, [])

  const handleSelectCourt = useCallback(
    (court: Court) => {
      setSelectedCourt(court)
      if (isMobile) {
        setSheet({ type: 'card', court })
      } else {
        setView('map')
      }
    },
    [isMobile],
  )

  const handleMarkerTap = useCallback(
    (court: Court) => {
      if (!isMobile) return
      setSelectedCourt(court)
      setSheet({ type: 'card', court })
    },
    [isMobile],
  )

  const handleAddToggle = useCallback(() => {
    setAddMode((prev) => {
      const next = !prev
      if (!next) setPick(null)
      return next
    })
  }, [])

  const handleAddSuccess = useCallback(
    (court: Court) => {
      handleCreated(court)
      setSheet({ type: 'none' })
    },
    [handleCreated],
  )

  const handleCancelAdd = useCallback(() => {
    setAddMode(false)
    setPick(null)
  }, [])

  const handleOpenList = useCallback(() => {
    setSheet({ type: 'list' })
    setSelectedCourt(null)
  }, [])

  const formOpen = addMode && pick != null
  const fabVisible = isMobile && !addMode && sheet.type === 'none'
  const cancelFabVisible = isMobile && addMode && pick == null

  return (
    <>
      {view === 'map' || isMobile ? (
        <MapView
          courts={courts}
          onCourtsChange={setCourts}
          addMode={addMode}
          onMapClick={handleMapClick}
          selectedCourt={selectedCourt}
          onMarkerTap={handleMarkerTap}
          isMobile={isMobile}
        />
      ) : (
        <CourtList courts={listCourts} onSelect={handleSelectCourt} />
      )}

      {isMobile && (
        <>
          <div className="mobile-top-bar">
            <button type="button" className="mobile-top-bar__btn" onClick={handleOpenList}>
              Список
            </button>
          </div>

          {fabVisible && (
            <button type="button" className="fab" onClick={handleAddToggle}>
              + Добавить
            </button>
          )}

          {cancelFabVisible && (
            <button type="button" className="fab fab--cancel" onClick={handleAddToggle}>
              Отмена
            </button>
          )}

          {cancelFabVisible && (
            <div className="mobile-add-hint">Нажмите на карту, чтобы выбрать точку</div>
          )}

          <BottomSheet
            open={sheet.type === 'card'}
            onClose={() => setSheet({ type: 'none' })}
          >
            {sheet.type === 'card' && <CourtCard court={sheet.court} />}
          </BottomSheet>

          <BottomSheet
            open={sheet.type === 'list'}
            onClose={() => setSheet({ type: 'none' })}
          >
            {sheet.type === 'list' && <CourtList courts={listCourts} onSelect={handleSelectCourt} />}
          </BottomSheet>

          <BottomSheet open={formOpen} modal onClose={handleCancelAdd}>
            {formOpen && (
              <CourtForm
                coordinates={pick}
                onCreated={handleAddSuccess}
                onCancel={handleCancelAdd}
              />
            )}
          </BottomSheet>
        </>
      )}

      {!isMobile && (
        <>
          <button
            type="button"
            className="view-toggle"
            onClick={() => setView((prev) => (prev === 'map' ? 'list' : 'map'))}
          >
            {view === 'map' ? 'Список' : 'Карта'}
          </button>
          {view === 'map' && (
            <button type="button" className="add-court-button" onClick={handleAddToggle}>
              {addMode ? 'Отмена' : 'Добавить площадку'}
            </button>
          )}
          {addMode && (
            <CourtForm
              coordinates={pick}
              onCreated={handleCreated}
              onCancel={handleCancelAdd}
            />
          )}
        </>
      )}
    </>
  )
}

export default App
