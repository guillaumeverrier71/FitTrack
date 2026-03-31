import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Crown, Check } from 'lucide-react'
import { useLang } from '../../context/LangContext'
import { usePremium } from '../../context/PremiumContext'

export default function PremiumSuccessPage() {
  const { lang } = useLang()
  const { isPremium } = usePremium()
  const navigate = useNavigate()
  const [countdown, setCountdown] = useState(5)
  const fr = lang !== 'en'

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(timer); navigate('/'); }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const features = fr
    ? ['Séances illimitées', 'Progression & graphiques', 'Médailles & achievements', 'Suggestions de progression', 'Historique complet']
    : ['Unlimited workouts', 'Progress & charts', 'Medals & achievements', 'Smart suggestions', 'Full history']

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6 gap-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-24 h-24 rounded-full bg-yellow-500/20 border-2 border-yellow-500/40 flex items-center justify-center">
          <Crown size={40} className="text-yellow-400" />
        </div>
        <h1 className="text-white text-2xl font-bold">
          {fr ? 'Bienvenue dans Premium !' : 'Welcome to Premium!'}
        </h1>
        <p className="text-gray-400 text-sm">
          {fr ? 'Ton paiement a été confirmé.' : 'Your payment has been confirmed.'}
        </p>
      </div>

      <div className="w-full bg-gray-900 rounded-2xl p-5 flex flex-col gap-3">
        {features.map(f => (
          <div key={f} className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
              <Check size={12} className="text-green-400" />
            </div>
            <span className="text-gray-200 text-sm">{f}</span>
          </div>
        ))}
      </div>

      <button
        onClick={() => navigate('/')}
        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-4 rounded-2xl transition-colors"
      >
        {fr ? `Commencer (${countdown}s)` : `Get started (${countdown}s)`}
      </button>
    </div>
  )
}
