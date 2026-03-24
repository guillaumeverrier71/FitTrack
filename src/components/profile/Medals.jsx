import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const MEDALS = [
  {
    id: 'first_session',
    emoji: '🏋️',
    name: 'Première séance',
    description: 'Tu as effectué ta première séance',
    check: ({ sessions }) => sessions >= 1,
  },
  {
    id: 'sessions_10',
    emoji: '🔟',
    name: '10 séances',
    description: '10 séances complétées',
    check: ({ sessions }) => sessions >= 10,
  },
  {
    id: 'sessions_50',
    emoji: '💪',
    name: '50 séances',
    description: '50 séances complétées',
    check: ({ sessions }) => sessions >= 50,
  },
  {
    id: 'sessions_100',
    emoji: '🏆',
    name: '100 séances',
    description: '100 séances complétées',
    check: ({ sessions }) => sessions >= 100,
  },
  {
    id: 'streak_7',
    emoji: '🔥',
    name: 'Streak 7 jours',
    description: '7 jours consécutifs de séances',
    check: ({ streak }) => streak >= 7,
  },
  {
    id: 'streak_30',
    emoji: '⚡',
    name: 'Streak 30 jours',
    description: '30 jours consécutifs de séances',
    check: ({ streak }) => streak >= 30,
  },
  {
    id: 'first_steps_goal',
    emoji: '👟',
    name: 'Objectif de pas',
    description: 'Premier objectif de pas atteint',
    check: ({ stepsGoalReached }) => stepsGoalReached >= 1,
  },
  {
    id: 'steps_10000',
    emoji: '🚶',
    name: '10 000 pas',
    description: '10 000 pas en une journée',
    check: ({ maxSteps }) => maxSteps >= 10000,
  },
  {
    id: 'weight_goal',
    emoji: '⚖️',
    name: 'Objectif de poids',
    description: 'Objectif de poids atteint',
    check: ({ weightGoalReached }) => weightGoalReached,
  },
  {
    id: 'lifted_100',
    emoji: '🥉',
    name: '100kg soulevés',
    description: '100kg de volume total soulevé',
    check: ({ totalVolume }) => totalVolume >= 100,
  },
  {
    id: 'lifted_500',
    emoji: '🥈',
    name: '500kg soulevés',
    description: '500kg de volume total soulevé',
    check: ({ totalVolume }) => totalVolume >= 500,
  },
  {
    id: 'lifted_1000',
    emoji: '🥇',
    name: '1000kg soulevés',
    description: '1000kg de volume total soulevé',
    check: ({ totalVolume }) => totalVolume >= 1000,
  },
  {
    id: 'first_record',
    emoji: '📈',
    name: 'Premier record',
    description: 'Tu as battu un record sur un exercice',
    check: ({ recordBeaten }) => recordBeaten >= 1,
  },
]

export default function Medals() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      // Nombre de séances
      const { count: sessions } = await supabase
        .from('workout_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .not('finished_at', 'is', null)

      // Streak
      const { data: allSessions } = await supabase
        .from('workout_sessions')
        .select('finished_at')
        .eq('user_id', user.id)
        .not('finished_at', 'is', null)
        .order('finished_at', { ascending: false })

      let streak = 0
      if (allSessions?.length) {
        const uniqueDays = [...new Set(allSessions.map(s => s.finished_at.split('T')[0]))]
        let current = new Date()
        for (const day of uniqueDays) {
          const d = new Date(day)
          const diff = Math.floor((current - d) / 1000 / 60 / 60 / 24)
          if (diff <= 1) { streak++; current = d }
          else break
        }
      }

      // Pas
      const { data: stepsData } = await supabase
        .from('daily_steps')
        .select('steps, goal')
        .eq('user_id', user.id)

      const maxSteps = stepsData ? Math.max(...stepsData.map(s => s.steps), 0) : 0
      const stepsGoalReached = stepsData ? stepsData.filter(s => s.steps >= s.goal).length : 0

      // Poids
      const { data: profileData } = await supabase
        .from('user_profile')
        .select('weight_goal_kg')
        .eq('user_id', user.id)
        .single()

      const { data: weightEntries } = await supabase
        .from('weight_entries')
        .select('weight_kg')
        .eq('user_id', user.id)
        .order('date', { ascending: false })

      const currentWeight = weightEntries?.[0]?.weight_kg
      const goalWeight = profileData?.weight_goal_kg
      const weightGoalReached = currentWeight && goalWeight
        ? parseFloat(currentWeight) <= parseFloat(goalWeight)
        : false

      // Volume total soulevé
      const { data: setsData } = await supabase
        .from('session_sets')
        .select('weight_kg, reps, workout_sessions!inner(user_id)')
        .eq('workout_sessions.user_id', user.id)

      const totalVolume = setsData
        ? setsData.reduce((s, set) => s + (set.weight_kg * set.reps), 0)
        : 0

      // Records battus — on compte les exercices où le poids a augmenté
      const { data: allSets } = await supabase
        .from('session_sets')
        .select('exercise_id, weight_kg, logged_at, workout_sessions!inner(user_id)')
        .eq('workout_sessions.user_id', user.id)
        .order('logged_at', { ascending: true })

      let recordBeaten = 0
      if (allSets) {
        const maxByExercise = {}
        allSets.forEach(set => {
          const prev = maxByExercise[set.exercise_id]
          if (prev !== undefined && set.weight_kg > prev) recordBeaten++
          if (!prev || set.weight_kg > prev) maxByExercise[set.exercise_id] = set.weight_kg
        })
      }

      setStats({ sessions, streak, maxSteps, stepsGoalReached, weightGoalReached, totalVolume, recordBeaten })
      setLoading(false)
    }
    fetchStats()
  }, [])

  if (loading) return <p className="text-gray-400 text-sm">Chargement des médailles...</p>
  if (!stats) return null

  const unlocked = MEDALS.filter(m => m.check(stats))
  const locked = MEDALS.filter(m => !m.check(stats))

  return (
    <div className="bg-gray-900 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold">Médailles</h2>
        <span className="text-indigo-400 text-sm font-medium">{unlocked.length} / {MEDALS.length}</span>
      </div>

      {/* Débloquées */}
      {unlocked.length > 0 && (
        <div className="flex flex-col gap-2 mb-4">
          {unlocked.map(medal => (
            <div key={medal.id} className="flex items-center gap-3 bg-indigo-950 rounded-xl px-4 py-3">
              <span className="text-2xl">{medal.emoji}</span>
              <div>
                <p className="text-white font-medium text-sm">{medal.name}</p>
                <p className="text-indigo-300 text-xs">{medal.description}</p>
              </div>
              <span className="ml-auto text-indigo-400 text-xs">✓</span>
            </div>
          ))}
        </div>
      )}

      {/* Verrouillées */}
      {locked.length > 0 && (
        <div className="flex flex-col gap-2">
          {locked.map(medal => (
            <div key={medal.id} className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3 opacity-50">
              <span className="text-2xl grayscale">{medal.emoji}</span>
              <div>
                <p className="text-gray-400 font-medium text-sm">{medal.name}</p>
                <p className="text-gray-500 text-xs">{medal.description}</p>
              </div>
              <span className="ml-auto text-gray-600 text-xs">🔒</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}