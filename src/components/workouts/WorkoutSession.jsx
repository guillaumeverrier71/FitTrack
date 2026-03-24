import { useState, useEffect } from 'react'
import { X, Plus, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function WorkoutSession({ template, onFinish }) {
  const [sessionId, setSessionId] = useState(null)
  const [sets, setSets] = useState({})
  const [saving, setSaving] = useState(false)

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

      // Init les séries depuis le template
      const initial = {}
      exercises.forEach(ex => {
        initial[ex.exercise_id] = Array.from({ length: ex.sets_target }, () => ({
          reps: ex.reps_target,
          weight: 0,
          done: false,
        }))
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
    setSets(prev => ({
      ...prev,
      [exerciseId]: prev[exerciseId].map((s, i) =>
        i === setIndex ? { ...s, done: !s.done } : s
      )
    }))
  }

  const addSet = (exerciseId) => {
    setSets(prev => ({
      ...prev,
      [exerciseId]: [...prev[exerciseId], { reps: 10, weight: 0, done: false }]
    }))
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
      await supabase.from('session_sets').insert(allSets)
    }

    await supabase
      .from('workout_sessions')
      .update({ finished_at: new Date().toISOString() })
      .eq('id', sessionId)

    setSaving(false)
    onFinish()
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <h1 className="text-white font-bold text-lg">{template.name}</h1>
        <button onClick={onFinish} className="text-gray-400 hover:text-white">
          <X size={22} />
        </button>
      </div>

      {/* Exercices */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 pb-32">
        {exercises.map(ex => (
          <div key={ex.exercise_id} className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-indigo-400 text-xs bg-indigo-950 px-2 py-0.5 rounded-full">
                {ex.exercises?.muscle_groups?.name}
              </span>
              <h2 className="text-white font-semibold">{ex.exercises?.name}</h2>
            </div>

            {/* Header colonnes */}
            <div className="grid grid-cols-4 gap-2 px-1">
              <span className="text-gray-500 text-xs text-center">Série</span>
              <span className="text-gray-500 text-xs text-center">Reps</span>
              <span className="text-gray-500 text-xs text-center">Poids (kg)</span>
              <span className="text-gray-500 text-xs text-center">✓</span>
            </div>

            {(sets[ex.exercise_id] || []).map((s, i) => (
              <div
                key={i}
                className={`grid grid-cols-4 gap-2 items-center p-2 rounded-xl transition-colors ${
                  s.done ? 'bg-indigo-950' : 'bg-gray-900'
                }`}
              >
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
                    s.done
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-800 text-gray-500'
                  }`}
                >
                  <Check size={16} />
                </button>
              </div>
            ))}

            <button
              onClick={() => addSet(ex.exercise_id)}
              className="flex items-center gap-2 text-indigo-400 text-sm py-2 hover:text-indigo-300 transition-colors"
            >
              <Plus size={16} /> Ajouter une série
            </button>
          </div>
        ))}
      </div>

      {/* Bouton terminer */}
      <div className="fixed bottom-16 left-0 right-0 p-4 bg-gray-950 border-t border-gray-800">
        <button
          onClick={handleFinish}
          disabled={saving}
          className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold py-4 rounded-xl transition-colors text-lg"
        >
          {saving ? 'Enregistrement...' : 'Terminer la séance ✓'}
        </button>
      </div>
    </div>
  )
}