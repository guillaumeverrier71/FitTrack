import { useEffect } from 'react'
import { AlertTriangle, LogOut } from 'lucide-react'

const VARIANTS = {
  danger: {
    icon: <AlertTriangle size={28} className="text-red-400" />,
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    confirm: 'bg-red-600 hover:bg-red-500',
  },
  logout: {
    icon: <LogOut size={28} className="text-orange-400" />,
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    confirm: 'bg-orange-600 hover:bg-orange-500',
  },
}

export default function ConfirmModal({ title, description, confirmLabel = 'Confirmer', cancelLabel = 'Annuler', variant = 'danger', onConfirm, onCancel }) {
  const v = VARIANTS[variant] || VARIANTS.danger

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm bg-gray-900 border border-gray-800 rounded-3xl p-6 flex flex-col gap-5"
        style={{ animation: 'slideUp 0.25s ease-out' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Icône */}
        <div className={`w-14 h-14 rounded-2xl ${v.bg} border ${v.border} flex items-center justify-center mx-auto`}>
          {v.icon}
        </div>

        {/* Texte */}
        <div className="text-center">
          <h2 className="text-white font-bold text-lg mb-1">{title}</h2>
          {description && <p className="text-gray-400 text-sm">{description}</p>}
        </div>

        {/* Boutons */}
        <div className="flex flex-col gap-2">
          <button
            onClick={onConfirm}
            className={`w-full ${v.confirm} text-white font-semibold py-3.5 rounded-2xl transition-colors`}
          >
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-3.5 rounded-2xl transition-colors"
          >
            {cancelLabel}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
      `}</style>
    </div>
  )
}
