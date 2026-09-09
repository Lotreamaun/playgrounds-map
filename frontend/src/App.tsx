import { useCallback, useEffect, useState } from 'react'
import MapView from './components/MapView'
import CourtForm from './components/CourtForm'
import CourtList from './components/CourtList'
import BottomSheet from './components/BottomSheet'
import SidePanel from './components/SidePanel'
import { CourtCard } from './components/CourtMarker'
import type { Coordinates } from './components/CourtForm'
import { getCourts } from './services/api'
import type { Court } from './services/api'
import { useMediaQuery } from './hooks/useMediaQuery'

type SheetState =
  | { type: 'none' }
  | { type: 'card'; court: Court }
  | { type: 'list' }
  | { type: 'form' }

function App() {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const [courts, setCourts] = useState<Court[]>([])
  const [addMode, setAddMode] = useState(false)
  const [pick, setPick] = useState<Coordinates | null>(null)
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null)
  const [sheet, setSheet] = useState<SheetState>({ type: 'none' })
  const [listCourts, setListCourts] = useState<Court[]>([])
  const [allCourtsLoaded, setAllCourtsLoaded] = useState(false)

  useEffect(() => {
    if (allCourtsLoaded) return
    getCourts()
      .then((all) => {
        setListCourts(all)
        setAllCourtsLoaded(true)
      })
      .catch((err) => {
        console.error('Failed to fetch all courts:', err)
      })
  }, [allCourtsLoaded])

  const handleMapClick = useCallback((latitude: number, longitude: number) => {
    setPick({ latitude, longitude })
    setSheet({ type: 'form' })
  }, [])

  const handleCreated = useCallback((court: Court) => {
    setCourts((prev) => [...prev.filter((c) => c.id !== court.id), court])
    setAddMode(false)
    setPick(null)
    setSheet({ type: 'none' })
  }, [])

  const handleSelectCourt = useCallback((court: Court) => {
    setSelectedCourt(court)
    setSheet({ type: 'card', court })
  }, [])

  const handleAddToggle = useCallback(() => {
    setAddMode((prev) => {
      const next = !prev
      if (next) {
        if (!isMobile) setSheet({ type: 'form' })
      } else {
        setPick(null)
        setSheet({ type: 'none' })
      }
      return next
    })
  }, [isMobile])

  const handleCancelAdd = useCallback(() => {
    setAddMode(false)
    setPick(null)
    setSheet({ type: 'none' })
  }, [])

  const handleCloseSheet = useCallback(() => {
    setSheet({ type: 'none' })
    setSelectedCourt(null)
  }, [])

  const handleOpenList = useCallback(() => {
    setSheet({ type: 'list' })
    setSelectedCourt(null)
  }, [])

  const fabVisible = isMobile && !addMode && sheet.type === 'none'
  const cancelFabVisible = isMobile && addMode && pick == null

  return (
    <>
      <div className="app-shell">
        {!isMobile && (
          <SidePanel open>
            {sheet.type === 'card' && (
              <div key="card" className="side-panel__pane side-panel__card">
                <button
                  type="button"
                  className="side-panel__close"
                  aria-label="Закрыть карточку площадки"
                  onClick={handleCloseSheet}
                >
                  ×
                </button>
                <CourtCard court={sheet.court} />
              </div>
            )}

            {sheet.type === 'form' && (
              <div key="form" className="side-panel__pane">
                <CourtForm coordinates={pick} onCreated={handleCreated} onCancel={handleCancelAdd} />
              </div>
            )}

            {(sheet.type === 'none' || sheet.type === 'list') && (
              <div key="list" className="side-panel__pane side-panel__list">
                <button type="button" className="side-panel__add-btn" onClick={handleAddToggle}>
                  Добавить площадку
                </button>
                <CourtList courts={listCourts} onSelect={handleSelectCourt} />
              </div>
            )}
          </SidePanel>
        )}

        <MapView
          courts={courts}
          onCourtsChange={setCourts}
          addMode={addMode}
          onMapClick={handleMapClick}
          selectedCourt={selectedCourt}
          onMarkerTap={handleSelectCourt}
        />
      </div>

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

          <BottomSheet open={sheet.type === 'card'} onClose={handleCloseSheet}>
            {sheet.type === 'card' && <CourtCard court={sheet.court} />}
          </BottomSheet>

          <BottomSheet open={sheet.type === 'list'} onClose={handleCloseSheet}>
            {sheet.type === 'list' && <CourtList courts={listCourts} onSelect={handleSelectCourt} />}
          </BottomSheet>

          <BottomSheet open={sheet.type === 'form'} modal onClose={handleCancelAdd}>
            {sheet.type === 'form' && (
              <CourtForm coordinates={pick} onCreated={handleCreated} onCancel={handleCancelAdd} />
            )}
          </BottomSheet>
        </>
      )}
    </>
  )
}

export default App
