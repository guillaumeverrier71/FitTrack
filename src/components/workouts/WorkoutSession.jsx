import { useState, useEffect, useRef } from 'react'
import { X, Plus, Check, Pause, Play } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import ConfirmModal from '../ui/ConfirmModal'
import { useToast } from '../../context/ToastContext'
import { handleSupabaseError } from '../../lib/handleError'
import { useLang } from '../../context/LangContext'

function getSuggestion(lastWeight, lastReps) {
  if (!lastWeight || !lastReps) return null
  if (lastReps >= 12) {
    return { weight: parseFloat(lastWeight) + 2, reps: 8, reason: '+2kg / retour 8 reps' }
  } else {
    return { weight: parseFloat(lastWeight), reps: lastReps + 2, reason: '+2 reps' }
  }
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const DEFAULT_REST = 90

export default function WorkoutSession({ template, onMinimize, onDone }) {
  const toast = useToast()
  const { t } = useLang()
  const [sessionId, setSessionId] = useState(null)
  const [sets, setSets] = useState({})
  const [lastSession, setLastSession] = useState({})
  const [saving, setSaving] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [paused, setPaused] = useState(false)
  const [confirmAbandon, setConfirmAbandon] = useState(false)

  const [restTimer, setRestTimer] = useState({ active: false, remaining: DEFAULT_REST, total: DEFAULT_REST })

  const intervalRef = useRef(null)

  useEffect(() => {
    if (paused) return
    intervalRef.current = setInterval(() => {
      setElapsed(e => e + 1)
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [paused])

  useEffect(() => {
    if (!restTimer.active) return
    const id = setInterval(() => {
      setRestTimer(prev => {
        if (prev.remaining <= 1) {
          navigator.vibrate?.([200, 100, 200])
          return { ...prev, active: false, remaining: 0 }
        }
        return { ...prev, remaining: prev.remaining - 1 }
      })
    }, 1000)
    return () => clearInterval(id)
  }, [restTimer.active])

  const exercises = template.template_exercises || []

  useEffect(() => {
    const startSession = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      const { data } = await supabase
        .from('workout_sessions')
        .insert({ user_id: user.id, template_id: template.id })
        .select()
        .single()
      setSessionId(data.id)

      const { data: lastSessions } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('template_id', template.id)
        .not('finished_at', 'is', null)
        .order('finished_at', { ascending: false })
        .limit(1)

      let lastSessionData = {}

      if (lastSessions?.length > 0) {
        const { data: lastSets } = await supabase
          .from('session_sets')
          .select('exercise_id, weight_kg, reps, set_number')
          .eq('session_id', lastSessions[0].id)
          .order('set_number', { ascending: true })

        if (lastSets) {
          lastSets.forEach(set => {
            if (!lastSessionData[set.exercise_id]) {
              lastSessionData[set.exercise_id] = []
            }
            lastSessionData[set.exercise_id].push({
              weight: set.weight_kg,
              reps: set.reps,
            })
          })
        }
      }

      setLastSession(lastSessionData)

      const initial = {}
      exercises.forEach(ex => {
        const lastExSets = lastSessionData[ex.exercise_id] || []
        initial[ex.exercise_id] = Array.from({ length: ex.sets_target }, (_, i) => {
          const lastSet = lastExSets[i]
          const suggestion = getSuggestion(lastSet?.weight, lastSet?.reps)
          return {
            reps: suggestion?.reps || ex.reps_target,
            weight: suggestion?.weight || 0,
            done: false,
          }
        })
      })
      setSets(initial)
    }
    startSession()
  }, [])

  const updateSet = (exerciseId, setIndex, field, value) => {
    setSets(prev => ({
      ...prev,
      [exerciseId]: prev[exerciseId].map((s, i) =>
        i === setIndex ? { ...s, [field]: value } : s
      )
    }))
  }

  const toggleDone = (exerciseId, setIndex) => {
    const wasDone = sets[exerciseId]?.[setIndex]?.done
    setSets(prev => ({
      ...prev,
      [exerciseId]: prev[exerciseId].map((s, i) =>
        i === setIndex ? { ...s, done: !s.done } : s
      )
    }))
    if (!wasDone) {
      setRestTimer({ active: true, remaining: DEFAULT_REST, total: DEFAULT_REST })
    }
  }

  const addSet = (exerciseId) => {
    setSets(prev => {
      const existing = prev[exerciseId] || []
      const lastSet = existing[existing.length - 1]
      return {
        ...prev,
        [exerciseId]: [...existing, { reps: lastSet?.reps || 10, weight: lastSet?.weight || 0, done: false }]
      }
    })
  }

  const skipRest = () => setRestTimer(prev => ({ ...prev, active: false }))
  const adjustRest = (delta) => {
    setRestTimer(prev => ({ ...prev, remaining: Math.max(5, prev.remaining + delta) }))
  }

  const handleFinish = async () => {
    setSaving(true)
    const allSets = []

    exercises.forEach(ex => {
      const exSets = sets[ex.exercise_id] || []
      exSets.forEach((s, i) => {
        if (s.done) {
          allSets.push({
            session_id: sessionId,
            exercise_id: ex.exercise_id,
            set_number: i + 1,
            reps: s.reps,
            weight_kg: parseFloat(s.weight) || 0,
          })
        }
      })
    })

    if (allSets.length > 0) {
      const { error: setsError } = await supabase.from('session_sets').insert(allSets)
      if (setsError) {
        await handleSupabaseError(setsError, toast, 'Erreur lors de la sauvegarde des séries.')
        setSaving(false)
        return
      }
    }

    const { error: sessionError } = await supabase
      .from('workout_sessions')
      .update({ finished_at: new Date().toISOString() })
      .eq('id', sessionId)

    if (sessionError) {
      await handleSupabaseError(sessionError, toast, 'Erreur lors de la finalisation de la séance.')
      setSaving(false)
      return
    }

    toast.success('Séance enregistrée !')

    if (Notification.permission === 'granted' && 'serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready
      reg.showNotification('Séance terminée ! 💪', {
        body: `${allSets.length} série${allSets.length > 1 ? 's' : ''} complétée${allSets.length > 1 ? 's' : ''}. Excellent travail !`,
        icon: '/icon-192.png',
        tag: 'workout-done',
      })
    }

    setSaving(false)
    onDone()
  }

  const handleAbandon = async () => {
    if (sessionId) {
      await supabase.from('session_sets').delete().eq('session_id', sessionId)
      await supabase.from('workout_sessions').delete().eq('id', sessionId)
    }
    onDone()
  }

  const restCircumference = 2 * Math.PI * 22
  const restProgress = restTimer.active ? restTimer.remaining / restTimer.total : 0

  return (
    <div className="h-full bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <h1 className="text-white font-bold text-lg">{template.name}</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-900 px-3 py-1.5 rounded-xl">
            <span className={`text-sm font-mono font-semibold ${paused ? 'text-gray-500' : 'text-indigo-400'}`}>
              {formatTime(elapsed)}
            </span>
            <button
              onClick={() => setPaused(p => !p)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              {paused ? <Play size={15} fill="currentColor" /> : <Pause size={15} />}
            </button>
          </div>
          <button onClick={onMinimize} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>
      </div>

      {/* Exercices */}
      <div className={`flex-1 overflow-y-auto p-4 flex flex-col gap-6 ${restTimer.active ? 'pb-56' : 'pb-32'}`}>
        {exercises.map(ex => {
          const lastExSets = lastSession[ex.exercise_id] || []

          return (
            <div key={ex.exercise_id} className="flex flex-col gap-3">

              <div className="flex items-center gap-2">
                <span className="text-indigo-400 text-xs bg-indigo-950 px-2 py-0.5 rounded-full">
                  {ex.exercises?.muscle_groups?.name}
                </span>
                <h2 className="text-white font-semibold">{ex.exercises?.name}</h2>
              </div>

              {ex.exercises?.gif_url && (
                <img
                  src={ex.exercises.gif_url}
                  alt={ex.exercises.name}
                  className="w-full max-h-40 object-contain rounded-xl bg-gray-900"
                  onError={e => e.target.style.display = 'none'}
                />
              )}

              <div className="grid grid-cols-4 gap-2 px-1">
                <span className="text-gray-500 text-xs text-center">{t('session.setLabel', { n: '' }).trim()}</span>
                <span className="text-gray-500 text-xs text-center">{t('session.reps')}</span>
                <span className="text-gray-500 text-xs text-center">{t('session.weightKg')}</span>
                <span className="text-gray-500 text-xs text-center">✓</span>
              </div>

              {(sets[ex.exercise_id] || []).map((s, i) => {
                const lastSet = lastExSets[i]
                const suggestion = getSuggestion(lastSet?.weight, lastSet?.reps)

                return (
                  <div key={i} className="flex flex-col gap-1">
                    <div className={`grid grid-cols-4 gap-2 items-center p-2 rounded-xl transition-colors ${
                      s.done ? 'bg-indigo-950' : 'bg-gray-900'
                    }`}>
                      <span className="text-gray-400 text-sm text-center">{i + 1}</span>
                      <input
                        type="number"
                        value={s.reps}
                        onChange={e => updateSet(ex.exercise_id, i, 'reps', parseInt(e.target.value) || 0)}
                        className="bg-gray-800 text-white text-center rounded-lg py-2 outline-none focus:ring-2 focus:ring-indigo-500 w-full"
                      />
                      <input
                        type="number"
                        value={s.weight}
                        step="0.5"
                        onChange={e => updateSet(ex.exercise_id, i, 'weight', e.target.value)}
                        className="bg-gray-800 text-white text-center rounded-lg py-2 outline-none focus:ring-2 focus:ring-indigo-500 w-full"
                      />
                      <button
                        onClick={() => toggleDone(ex.exercise_id, i)}
                        className={`mx-auto flex items-center justify-center w-9 h-9 rounded-xl transition-colors ${
                          s.done ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-500'
                        }`}
                      >
                        <Check size={16} />
                      </button>
                    </div>

                    {lastSet && (
                      <div className="flex items-center gap-3 px-2">
                        <span className="text-gray-600 text-xs">
                          {`${lastSet.reps} reps × ${lastSet.weight}kg`}
                        </span>
                        {suggestion && (
                          <span className="text-indigo-400 text-xs">
                            → {suggestion.reps} reps × {suggestion.weight}kg
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              <button
                onClick={() => addSet(ex.exercise_id)}
                className="flex items-center gap-2 text-indigo-400 text-sm py-2 hover:text-indigo-300 transition-colors"
              >
                <Plus size={16} /> {t('session.addSet')}
              </button>
            </div>
          )
        })}
      </div>

      {/* Boutons bas + minuteur de repos */}
      <div className="fixed bottom-16 left-0 right-0 bg-gray-950 border-t border-gray-800">

        {restTimer.active && (
          <div className="px-4 pt-3 pb-2 border-b border-gray-800">
            <div className="flex items-center gap-4">
              <div className="relative w-14 h-14 shrink-0">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="22" fill="none" stroke="#1f2937" strokeWidth="5" />
                  <circle
                    cx="28" cy="28" r="22"
                    fill="none"
                    stroke={restTimer.remaining <= 10 ? '#ef4444' : '#6366f1'}
                    strokeWidth="5"
                    strokeDasharray={restCircumference}
                    strokeDashoffset={restCircumference * (1 - restProgress)}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`font-mono font-bold text-sm ${restTimer.remaining <= 10 ? 'text-red-400' : 'text-white'}`}>
                    {formatTime(restTimer.remaining)}
                  </span>
                </div>
              </div>

              <div className="flex-1">
                <p className="text-gray-400 text-xs mb-1.5">{t('common.skip')}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => adjustRest(-30)}
                    className="flex-1 bg-gray-800 text-gray-400 text-sm py-1.5 rounded-xl"
                  >
                    −30s
                  </button>
                  <button
                    onClick={skipRest}
                    className="flex-1 bg-indigo-600 text-white text-sm py-1.5 rounded-xl font-medium"
                  >
                    {t('common.skip')}
                  </button>
                  <button
                    onClick={() => adjustRest(30)}
                    className="flex-1 bg-gray-800 text-gray-400 text-sm py-1.5 rounded-xl"
                  >
                    +30s
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="p-4 flex gap-3">
          <button
            onClick={() => setConfirmAbandon(true)}
            className="bg-gray-800 hover:bg-red-950 text-red-400 font-semibold py-4 px-5 rounded-xl transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleFinish}
            disabled={saving}
            className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold py-4 rounded-xl transition-colors"
          >
            {saving ? t('common.saving') : t('session.finishBtn')}
          </button>
        </div>
      </div>

      {confirmAbandon && (
        <ConfirmModal
          title={t('session.finishTitle')}
          description={t('session.finishDesc')}
          confirmLabel={t('common.confirm')}
          onConfirm={() => { setConfirmAbandon(false); handleAbandon() }}
          onCancel={() => setConfirmAbandon(false)}
        />
      )}
    </div>
  )
}
