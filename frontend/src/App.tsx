import { useCallback, useState } from 'react'
import MapView from './components/MapView'
import CourtForm from './components/CourtForm'
import type { Coordinates } from './components/CourtForm'
import type { Court } from './services/api'

function App() {
  const [courts, setCourts] = useState<Court[]>([])
  const [addMode, setAddMode] = useState(false)
  const [pick, setPick] = useState<Coordinates | null>(null)

  const handleMapClick = useCallback((latitude: number, longitude: number) => {
    setPick({ latitude, longitude })
  }, [])

  const handleCreated = useCallback((court: Court) => {
    setCourts((prev) => [...prev.filter((c) => c.id !== court.id), court])
    setAddMode(false)
    setPick(null)
  }, [])

  const handleAddToggle = useCallback(() => {
    setAddMode((prev) => {
      const next = !prev
      if (!next) setPick(null)
      return next
    })
  }, [])

  return (
    <>
      <MapView
        courts={courts}
        onCourtsChange={setCourts}
        addMode={addMode}
        onMapClick={handleMapClick}
      />
      {addMode && (
        <CourtForm
          coordinates={pick}
          onCreated={handleCreated}
          onCancel={() => {
            setAddMode(false)
            setPick(null)
          }}
        />
      )}
      <button type="button" className="add-court-button" onClick={handleAddToggle}>
        {addMode ? 'Cancel' : 'Add court'}
      </button>
    </>
  )
}

export default App
