import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { ChevronRight } from 'lucide-react'
import { useLang } from '../../context/LangContext'

const CALORIE_DEFAULTS = {
  lose_weight: 1800,
  maintain: 2200,
  gain_muscle: 2600,
  endurance: 2400,
}

export default function OnboardingModal({ userId, onDone }) {
  const { t, lang, setLang } = useLang()
  const [step, setStep] = useState(0)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [goal, setGoal] = useState('')
  const [saving, setSaving] = useState(false)

  const GOALS = [
    { value: 'lose_weight', label: t('onboarding.goalLoseWeight'), emoji: '🔥' },
    { value: 'maintain', label: t('onboarding.goalMaintain'), emoji: '⚖️' },
    { value: 'gain_muscle', label: t('onboarding.goalGainMuscle'), emoji: '💪' },
    { value: 'endurance', label: t('onboarding.goalEndurance'), emoji: '🏃' },
  ]

  const steps = ['lang', 'welcome', 'name', 'body', 'goal', 'done']
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
      {current !== 'lang' && current !== 'welcome' && current !== 'done' && (
        <div className="w-full h-1 bg-gray-800">
          <div
            className="h-1 bg-indigo-500 transition-all duration-300"
            style={{ width: `${((step - 2) / 3) * 100}%` }}
          />
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">

        {current === 'lang' && (
          <>
            <div className="text-center w-full">
              <h2 className="text-2xl font-bold text-white mb-2">{t('onboarding.languageTitle')}</h2>
              <p className="text-gray-400 text-sm">{t('onboarding.languageSubtitle')}</p>
            </div>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setLang('fr')}
                className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-colors ${lang === 'fr' ? 'border-indigo-500 bg-indigo-950' : 'border-gray-800 bg-gray-900'}`}
              >
                <span className="text-2xl">🇫🇷</span>
                <span className={`font-medium ${lang === 'fr' ? 'text-white' : 'text-gray-300'}`}>Français</span>
              </button>
              <button
                onClick={() => setLang('en')}
                className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-colors ${lang === 'en' ? 'border-indigo-500 bg-indigo-950' : 'border-gray-800 bg-gray-900'}`}
              >
                <span className="text-2xl">🇬🇧</span>
                <span className={`font-medium ${lang === 'en' ? 'text-white' : 'text-gray-300'}`}>English</span>
              </button>
            </div>
            <button
              onClick={next}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-4 rounded-2xl transition-colors"
            >
              {t('common.continue')}
            </button>
          </>
        )}

        {current === 'welcome' && (
          <>
            <div
              className="w-20 h-20 rounded-2xl overflow-hidden shadow-lg"
              style={{
                backgroundImage: 'url(/fitnavigator-logo.png)',
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundColor: 'white',
              }}
            />
            <div className="text-center">
              <h1 className="text-3xl font-bold text-white mb-3">{t('onboarding.welcomeTitle')}</h1>
              <p className="text-gray-400 leading-relaxed">
                {t('onboarding.welcomeSubtitle')}
              </p>
            </div>
            <button
              onClick={next}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors"
            >
              {t('onboarding.start')} <ChevronRight size={20} />
            </button>
            <button onClick={onDone} className="text-gray-500 text-sm">
              {t('onboarding.skipNow')}
            </button>
          </>
        )}

        {current === 'name' && (
          <>
            <div className="text-center w-full">
              <h2 className="text-2xl font-bold text-white mb-2">{t('onboarding.nameTitle')}</h2>
              <p className="text-gray-400 text-sm">{t('onboarding.nameSubtitle')}</p>
            </div>
            <div className="flex flex-col gap-3 w-full">
              <input
                type="text"
                placeholder={t('onboarding.firstName')}
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                autoFocus
                className="bg-gray-900 border border-gray-700 text-white rounded-2xl px-4 py-4 text-lg outline-none focus:border-indigo-500 transition-colors"
              />
              <input
                type="text"
                placeholder={t('onboarding.lastName')}
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
              {t('common.continue')}
            </button>
          </>
        )}

        {current === 'body' && (
          <>
            <div className="text-center w-full">
              <h2 className="text-2xl font-bold text-white mb-2">{t('onboarding.bodyTitle')}</h2>
              <p className="text-gray-400 text-sm">{t('onboarding.bodySubtitle')}</p>
            </div>
            <div className="flex gap-3 w-full">
              <div className="flex-1">
                <label className="text-gray-400 text-xs mb-2 block">{t('onboarding.height')}</label>
                <input
                  type="number"
                  placeholder="175"
                  value={height}
                  onChange={e => setHeight(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-2xl px-4 py-4 text-lg outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div className="flex-1">
                <label className="text-gray-400 text-xs mb-2 block">{t('onboarding.weight')}</label>
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
              {height || weight ? t('common.continue') : t('common.skip')}
            </button>
          </>
        )}

        {current === 'goal' && (
          <>
            <div className="text-center w-full">
              <h2 className="text-2xl font-bold text-white mb-2">{t('onboarding.goalTitle')}</h2>
              <p className="text-gray-400 text-sm">{t('onboarding.goalSubtitle')}</p>
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
              {goal ? t('common.continue') : t('common.skip')}
            </button>
          </>
        )}

        {current === 'done' && (
          <>
            <div className="text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-white mb-3">
                {t('onboarding.doneTitle', { name: firstName ? `, ${firstName}` : '' })}
              </h2>
              <p className="text-gray-400 leading-relaxed">
                {t('onboarding.doneSubtitle')}
              </p>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl transition-colors"
            >
              {saving ? t('common.saving') : t('onboarding.doneBtn')}
            </button>
          </>
        )}

      </div>
    </div>
  )
}
