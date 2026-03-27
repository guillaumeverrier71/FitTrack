import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { ChevronRight, Dumbbell } from 'lucide-react'

const GOALS = [
  { value: 'lose_weight', label: 'Perdre du poids', emoji: '🔥' },
  { value: 'maintain', label: 'Maintenir mon poids', emoji: '⚖️' },
  { value: 'gain_muscle', label: 'Prendre du muscle', emoji: '💪' },
  { value: 'endurance', label: 'Améliorer mon endurance', emoji: '🏃' },
]

const CALORIE_DEFAULTS = {
  lose_weight: 1800,
  maintain: 2200,
  gain_muscle: 2600,
  endurance: 2400,
}

export default function OnboardingModal({ userId, onDone }) {
  const [step, setStep] = useState(0)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [goal, setGoal] = useState('')
  const [saving, setSaving] = useState(false)

  const steps = ['welcome', 'name', 'body', 'goal', 'done']
  const current = steps[step]

  const next = () => setStep(s => s + 1)

  const handleSave = async () => {
    setSaving(true)
    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ')

    await supabase.auth.updateUser({ data: { full_name: fullName } })

    await supabase.from('user_profile').upsert({
      user_id: userId,
      height_cm: parseFloat(height) || null,
      calorie_goal: goal ? CALORIE_DEFAULTS[goal] : null,
    }, { onConflict: 'user_id' })

    if (parseFloat(weight)) {
      await supabase.from('weight_entries').insert({
        user_id: userId,
        weight_kg: parseFloat(weight),
        date: new Date().toISOString().split('T')[0],
      })
    }

    localStorage.setItem(`onboarding_done_${userId}`, '1')
    setSaving(false)
    onDone()
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col">
      {/* Progress bar */}
      {current !== 'welcome' && current !== 'done' && (
        <div className="w-full h-1 bg-gray-800">
          <div
            className="h-1 bg-indigo-500 transition-all duration-300"
            style={{ width: `${((step - 1) / 3) * 100}%` }}
          />
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">

        {current === 'welcome' && (
          <>
            <div className="flex items-center justify-center w-20 h-20 bg-indigo-600 rounded-3xl">
              <Dumbbell size={40} className="text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-bold text-white mb-3">Bienvenue sur FitTrack</h1>
              <p className="text-gray-400 leading-relaxed">
                Prends 30 secondes pour configurer ton profil et obtenir une expérience personnalisée.
              </p>
            </div>
            <button
              onClick={next}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors"
            >
              Commencer <ChevronRight size={20} />
            </button>
            <button onClick={onDone} className="text-gray-500 text-sm">
              Passer pour l'instant
            </button>
          </>
        )}

        {current === 'name' && (
          <>
            <div className="text-center w-full">
              <h2 className="text-2xl font-bold text-white mb-2">Comment tu t'appelles ?</h2>
              <p className="text-gray-400 text-sm">Pour personnaliser ton expérience</p>
            </div>
            <div className="flex flex-col gap-3 w-full">
              <input
                type="text"
                placeholder="Prénom"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                autoFocus
                className="bg-gray-900 border border-gray-700 text-white rounded-2xl px-4 py-4 text-lg outline-none focus:border-indigo-500 transition-colors"
              />
              <input
                type="text"
                placeholder="Nom (optionnel)"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                className="bg-gray-900 border border-gray-700 text-white rounded-2xl px-4 py-4 text-lg outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <button
              onClick={next}
              disabled={!firstName.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold py-4 rounded-2xl transition-colors"
            >
              Continuer
            </button>
          </>
        )}

        {current === 'body' && (
          <>
            <div className="text-center w-full">
              <h2 className="text-2xl font-bold text-white mb-2">Ton corps</h2>
              <p className="text-gray-400 text-sm">Ces données restent privées</p>
            </div>
            <div className="flex gap-3 w-full">
              <div className="flex-1">
                <label className="text-gray-400 text-xs mb-2 block">Taille (cm)</label>
                <input
                  type="number"
                  placeholder="175"
                  value={height}
                  onChange={e => setHeight(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-2xl px-4 py-4 text-lg outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div className="flex-1">
                <label className="text-gray-400 text-xs mb-2 block">Poids (kg)</label>
                <input
                  type="number"
                  placeholder="70"
                  step="0.1"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-2xl px-4 py-4 text-lg outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
            <button
              onClick={next}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-4 rounded-2xl transition-colors"
            >
              {height || weight ? 'Continuer' : 'Passer'}
            </button>
          </>
        )}

        {current === 'goal' && (
          <>
            <div className="text-center w-full">
              <h2 className="text-2xl font-bold text-white mb-2">Ton objectif</h2>
              <p className="text-gray-400 text-sm">On adaptera tes recommandations</p>
            </div>
            <div className="flex flex-col gap-3 w-full">
              {GOALS.map(g => (
                <button
                  key={g.value}
                  onClick={() => setGoal(g.value)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-colors ${
                    goal === g.value
                      ? 'border-indigo-500 bg-indigo-950'
                      : 'border-gray-800 bg-gray-900'
                  }`}
                >
                  <span className="text-2xl">{g.emoji}</span>
                  <span className={`font-medium ${goal === g.value ? 'text-white' : 'text-gray-300'}`}>
                    {g.label}
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={() => { next() }}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-4 rounded-2xl transition-colors"
            >
              {goal ? 'Continuer' : 'Passer'}
            </button>
          </>
        )}

        {current === 'done' && (
          <>
            <div className="text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-white mb-3">
                Prêt{firstName ? `, ${firstName}` : ''} !
              </h2>
              <p className="text-gray-400 leading-relaxed">
                Ton profil est configuré. Il ne te reste plus qu'à commencer ta première séance.
              </p>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl transition-colors"
            >
              {saving ? 'Enregistrement...' : "C'est parti !"}
            </button>
          </>
        )}

      </div>
    </div>
  )
}
