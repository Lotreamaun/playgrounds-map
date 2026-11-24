import { useToast } from '../hooks/useToast'

interface ToastProps {
  /** CSS `bottom` value; lets the app keep the toast above the card sheet. */
  bottom: string
}

/** The live region is always mounted so announcements are reliable. */
function Toast({ bottom }: ToastProps) {
  const toast = useToast()
  return (
    <div className="toast-region" style={{ bottom }} role="status" aria-live="polite">
      {toast != null && (
        <div key={toast.id} className="toast">
          {toast.message}
        </div>
      )}
    </div>
  )
}

export default Toast
