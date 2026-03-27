import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

let idCounter = 0

const ICONS = {
  success: <CheckCircle size={16} className="text-green-400 shrink-0" />,
  error: <AlertTriangle size={16} className="text-red-400 shrink-0" />,
  warning: <AlertTriangle size={16} className="text-orange-400 shrink-0" />,
  info: <Info size={16} className="text-indigo-400 shrink-0" />,
}

const COLORS = {
  success: 'border-green-500/20 bg-green-500/10',
  error: 'border-red-500/20 bg-red-500/10',
  warning: 'border-orange-500/20 bg-orange-500/10',
  info: 'border-indigo-500/20 bg-indigo-500/10',
}

const TEXT_COLORS = {
  success: 'text-green-100',
  error: 'text-red-100',
  warning: 'text-orange-100',
  info: 'text-indigo-100',
}

function ToastItem({ toast, onRemove }) {
  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-2xl border shadow-lg backdrop-blur ${COLORS[toast.type]}`}
      style={{ animation: 'slideUp 0.2s ease-out' }}
    >
      {ICONS[toast.type]}
      <p className={`text-sm flex-1 ${TEXT_COLORS[toast.type]}`}>{toast.message}</p>
      <button onClick={() => onRemove(toast.id)} className="text-gray-500 hover:text-white transition-colors">
        <X size={14} />
      </button>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++idCounter
    setToasts(prev => [...prev, { id, message, type }])
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration)
    }
    return id
  }, [removeToast])

  const toast = {
    success: (msg, duration) => addToast(msg, 'success', duration),
    error: (msg, duration) => addToast(msg, 'error', duration ?? 6000),
    warning: (msg, duration) => addToast(msg, 'warning', duration),
    info: (msg, duration) => addToast(msg, 'info', duration),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed bottom-20 left-4 right-4 z-[100] flex flex-col gap-2">
          {toasts.map(t => (
            <ToastItem key={t.id} toast={t} onRemove={removeToast} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
