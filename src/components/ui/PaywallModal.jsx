import { useState } from 'react'
import { X, Check, Crown, Loader } from 'lucide-react'
import { useLang } from '../../context/LangContext'
import { supabase } from '../../lib/supabase'

const PLANS = [
  {
    key: 'monthly',
    price: '4.99€',
    period: '/mois',
    periodEn: '/month',
    badge: null,
  },
  {
    key: 'yearly',
    price: '39.99€',
    period: '/an',
    periodEn: '/year',
    badge: { fr: '−33%', en: '−33%' },
    sub: { fr: 'soit 3.33€/mois', en: '3.33€/month' },
  },
]

const FREE_FEATURES = {
  fr: [
    '1 séance type',
    'Suivi poids basique',
    'Calories du jour',
  ],
  en: [
    '1 workout template',
    'Basic weight tracking',
    'Daily calories',
  ],
}

const PREMIUM_FEATURES = {
  fr: [
    'Séances types illimitées',
    'Progression & graphiques',
    'Médailles & achievements',
    'Suggestions de progression',
    'Macros & objectifs nutritionnels',
    'Historique complet',
  ],
  en: [
    'Unlimited workout templates',
    'Progress & charts',
    'Medals & achievements',
    'Smart progression suggestions',
    'Macros & nutrition goals',
    'Full history',
  ],
}

export default function PaywallModal({ onClose, onSelectPlan }) {
  const { lang } = useLang()
  const fr = lang !== 'en'
  const [loading, setLoading] = useState(null) // 'monthly' | 'yearly'
  const [error, setError] = useState(null)

  const handleSelectPlan = async (plan) => {
    setLoading(plan)
    setError(null)
    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-checkout-session', {
        body: { plan },
      })
      if (fnError || !data?.url) throw fnError || new Error('No URL returned')
      window.location.href = data.url
    } catch (err) {
      setError(fr ? 'Erreur lors de la connexion à Stripe.' : 'Error connecting to Stripe.')
      setLoading(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end">
      <div className="bg-gray-950 rounded-t-3xl p-6 flex flex-col gap-5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown size={22} className="text-yellow-400" />
            <h2 className="text-white text-xl font-bold">
              {fr ? 'Passer à Premium' : 'Upgrade to Premium'}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
            <X size={22} />
          </button>
        </div>

        {/* Comparaison Free vs Premium */}
        <div className="bg-gray-900 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex gap-4">
            <div className="flex-1">
              <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">Free</p>
              {FREE_FEATURES[fr ? 'fr' : 'en'].map(f => (
                <div key={f} className="flex items-center gap-2 mb-1.5">
                  <Check size={13} className="text-gray-600 shrink-0" />
                  <span className="text-gray-500 text-xs">{f}</span>
                </div>
              ))}
            </div>
            <div className="w-px bg-gray-800" />
            <div className="flex-1">
              <div className="flex items-center gap-1 mb-2">
                <Crown size={12} className="text-yellow-400" />
                <p className="text-yellow-400 text-xs font-medium uppercase tracking-wider">Premium</p>
              </div>
              {PREMIUM_FEATURES[fr ? 'fr' : 'en'].map(f => (
                <div key={f} className="flex items-center gap-2 mb-1.5">
                  <Check size={13} className="text-indigo-400 shrink-0" />
                  <span className="text-gray-200 text-xs">{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Plans */}
        <div className="flex flex-col gap-3">
          {PLANS.map(plan => (
            <button
              key={plan.key}
              onClick={() => handleSelectPlan(plan.key)}
              disabled={!!loading}
              className={`relative flex items-center justify-between p-4 rounded-2xl border-2 transition-colors text-left disabled:opacity-60 ${
                plan.key === 'yearly'
                  ? 'border-indigo-500 bg-indigo-950/50'
                  : 'border-gray-800 bg-gray-900'
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-2.5 right-4 bg-indigo-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {plan.badge[fr ? 'fr' : 'en']}
                </span>
              )}
              <div>
                <p className="text-white font-semibold">
                  {plan.key === 'monthly'
                    ? (fr ? 'Mensuel' : 'Monthly')
                    : (fr ? 'Annuel' : 'Yearly')}
                </p>
                {plan.sub && (
                  <p className="text-gray-400 text-xs mt-0.5">{plan.sub[fr ? 'fr' : 'en']}</p>
                )}
              </div>
              <div className="text-right flex items-center gap-2">
                {loading === plan.key && <Loader size={16} className="text-indigo-400 animate-spin" />}
                <div>
                  <p className="text-white font-bold text-lg">{plan.price}</p>
                  <p className="text-gray-400 text-xs">{fr ? plan.period : plan.periodEn}</p>
                </div>
              </div>
            </button>
          ))}
          {error && <p className="text-red-400 text-xs text-center">{error}</p>}
        </div>

        <p className="text-gray-600 text-xs text-center">
          {fr
            ? 'Résiliable à tout moment. Paiement sécurisé via le Play Store.'
            : 'Cancel anytime. Secure payment via the Play Store.'}
        </p>

        <button onClick={onClose} className="text-gray-500 text-sm text-center py-1">
          {fr ? 'Continuer gratuitement' : 'Continue for free'}
        </button>
      </div>
    </div>
  )
}
