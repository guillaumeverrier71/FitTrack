import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { X } from 'lucide-react'

const MEDALS = [
  // Séances
  { id: 'first_session',  emoji: '🏋️', name: 'Première séance',     description: 'Tu as complété ta première séance',         check: ({ sessions }) => sessions >= 1 },
  { id: 'sessions_5',     emoji: '🙌', name: '5 séances',            description: '5 séances complétées',                      check: ({ sessions }) => sessions >= 5 },
  { id: 'sessions_10',    emoji: '🔟', name: '10 séances',           description: '10 séances complétées',                     check: ({ sessions }) => sessions >= 10 },
  { id: 'sessions_25',    emoji: '💪', name: '25 séances',           description: '25 séances complétées',                     check: ({ sessions }) => sessions >= 25 },
  { id: 'sessions_50',    emoji: '🥉', name: '50 séances',           description: '50 séances complétées',                     check: ({ sessions }) => sessions >= 50 },
  { id: 'sessions_100',   emoji: '🏆', name: '100 séances',          description: '100 séances complétées',                    check: ({ sessions }) => sessions >= 100 },

  // Streak
  { id: 'streak_3',       emoji: '🔥', name: 'Streak 3 jours',       description: '3 jours consécutifs de séances',            check: ({ streak }) => streak >= 3 },
  { id: 'streak_7',       emoji: '⚡', name: 'Streak 7 jours',       description: '7 jours consécutifs de séances',            check: ({ streak }) => streak >= 7 },
  { id: 'streak_14',      emoji: '🌟', name: 'Streak 14 jours',      description: '2 semaines sans interruption',              check: ({ streak }) => streak >= 14 },
  { id: 'streak_30',      emoji: '🚀', name: 'Streak 30 jours',      description: '30 jours consécutifs de séances',           check: ({ streak }) => streak >= 30 },

  // Volume soulevé
  { id: 'lifted_100',     emoji: '🏅', name: '100 kg soulevés',      description: '100 kg de volume total soulevé',            check: ({ totalVolume }) => totalVolume >= 100 },
  { id: 'lifted_1000',    emoji: '🥈', name: '1 tonne soulevée',     description: '1 000 kg de volume total soulevé',          check: ({ totalVolume }) => totalVolume >= 1000 },
  { id: 'lifted_5000',    emoji: '🥇', name: '5 tonnes soulevées',   description: '5 000 kg de volume total soulevé',          check: ({ totalVolume }) => totalVolume >= 5000 },
  { id: 'lifted_10000',   emoji: '👑', name: '10 tonnes soulevées',  description: '10 000 kg de volume total soulevé',         check: ({ totalVolume }) => totalVolume >= 10000 },

  // Records
  { id: 'first_record',   emoji: '📈', name: 'Premier record',       description: 'Tu as battu un record sur un exercice',     check: ({ recordBeaten }) => recordBeaten >= 1 },
  { id: 'records_10',     emoji: '📊', name: '10 records battus',    description: '10 records battus sur des exercices',       check: ({ recordBeaten }) => recordBeaten >= 10 },

  // Pas
  { id: 'steps_5000',     emoji: '👟', name: '5 000 pas',            description: '5 000 pas en une journée',                  check: ({ maxSteps }) => maxSteps >= 5000 },
  { id: 'steps_10000',    emoji: '🚶', name: '10 000 pas',           description: '10 000 pas en une journée',                 check: ({ maxSteps }) => maxSteps >= 10000 },
  { id: 'steps_goal_1',   emoji: '🎯', name: 'Objectif de pas',      description: 'Premier objectif de pas atteint',           check: ({ stepsGoalReached }) => stepsGoalReached >= 1 },
  { id: 'steps_goal_7',   emoji: '🏃', name: 'Marcheur régulier',    description: 'Objectif de pas atteint 7 fois',            check: ({ stepsGoalReached }) => stepsGoalReached >= 7 },
  { id: 'steps_goal_30',  emoji: '🌍', name: 'Grand marcheur',       description: 'Objectif de pas atteint 30 fois',           check: ({ stepsGoalReached }) => stepsGoalReached >= 30 },

  // Nutrition
  { id: 'first_meal',     emoji: '🥗', name: 'Premier repas',        description: 'Premier repas enregistré',                  check: ({ meals }) => meals >= 1 },
  { id: 'meals_50',       emoji: '🍽️', name: '50 repas',             description: '50 repas enregistrés',                      check: ({ meals }) => meals >= 50 },
  { id: 'meals_100',      emoji: '👨‍🍳', name: 'Nutrition pro',        description: '100 repas enregistrés',                     check: ({ meals }) => meals >= 100 },

  // Poids
  { id: 'first_weight',   emoji: '⚖️', name: 'Première pesée',       description: 'Première pesée enregistrée',                check: ({ weightEntries }) => weightEntries >= 1 },
  { id: 'weight_7',       emoji: '📅', name: 'Suivi régulier',       description: '7 pesées enregistrées',                     check: ({ weightEntries }) => weightEntries >= 7 },
  { id: 'weight_30',      emoji: '📆', name: 'Suivi au long cours',  description: '30 pesées enregistrées',                    check: ({ weightEntries }) => weightEntries >= 30 },
  { id: 'weight_goal',    emoji: '🎉', name: 'Objectif de poids',    description: 'Objectif de poids atteint',                 check: ({ weightGoalReached }) => weightGoalReached },
]

function MedalUnlockModal({ medal, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-gray-900 border border-indigo-500/30 rounded-3xl p-8 flex flex-col items-center gap-4 w-full max-w-sm shadow-2xl animate-bounce-in"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'slideUp 0.4s ease-out' }}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-600 hover:text-gray-400">
          <X size={18} />
        </button>

        {/* Cercle emoji */}
        <div className="w-24 h-24 rounded-full bg-indigo-500/20 border-2 border-indigo-500/40 flex items-center justify-center">
          <span className="text-5xl">{medal.emoji}</span>
        </div>

        <div className="text-center">
          <p className="text-indigo-400 text-xs font-medium uppercase tracking-widest mb-1">Médaille débloquée !</p>
          <h2 className="text-white text-xl font-bold mb-2">{medal.name}</h2>
          <p className="text-gray-400 text-sm">{medal.description}</p>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-colors mt-2"
        >
          Super ! 🎉
        </button>
      </div>
    </div>
  )
}

export default function Medals() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [newMedalsQueue, setNewMedalsQueue] = useState([])

  useEffect(() => {
    const fetchStats = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const seenKey = `seen_medals_${user.id}`
      const seenIds = JSON.parse(localStorage.getItem(seenKey) || '[]')

      const [
        { count: sessions },
        { data: allSessions },
        { data: stepsData },
        { data: profileData },
        { data: weightEntries },
        { data: setsData },
        { data: allSets },
        { data: mealEntries },
      ] = await Promise.all([
        supabase.from('workout_sessions').select('*', { count: 'exact', head: true }).eq('user_id', user.id).not('finished_at', 'is', null),
        supabase.from('workout_sessions').select('finished_at').eq('user_id', user.id).not('finished_at', 'is', null).order('finished_at', { ascending: false }),
        supabase.from('daily_steps').select('steps, goal').eq('user_id', user.id),
        supabase.from('user_profile').select('weight_goal_kg').eq('user_id', user.id).single(),
        supabase.from('weight_entries').select('weight_kg').eq('user_id', user.id).order('date', { ascending: false }),
        supabase.from('session_sets').select('weight_kg, reps, workout_sessions!inner(user_id)').eq('workout_sessions.user_id', user.id),
        supabase.from('session_sets').select('exercise_id, weight_kg, logged_at, workout_sessions!inner(user_id)').eq('workout_sessions.user_id', user.id).order('logged_at', { ascending: true }),
        supabase.from('meal_entries').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ])

      // Streak
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

      const maxSteps = stepsData ? Math.max(...stepsData.map(s => s.steps), 0) : 0
      const stepsGoalReached = stepsData ? stepsData.filter(s => s.steps >= s.goal).length : 0

      const currentWeight = weightEntries?.[0]?.weight_kg
      const goalWeight = profileData?.weight_goal_kg
      const weightGoalReached = currentWeight && goalWeight
        ? parseFloat(currentWeight) <= parseFloat(goalWeight)
        : false

      const totalVolume = setsData ? setsData.reduce((s, set) => s + (set.weight_kg * set.reps), 0) : 0

      let recordBeaten = 0
      if (allSets) {
        const maxByExercise = {}
        allSets.forEach(set => {
          const prev = maxByExercise[set.exercise_id]
          if (prev !== undefined && set.weight_kg > prev) recordBeaten++
          if (!prev || set.weight_kg > prev) maxByExercise[set.exercise_id] = set.weight_kg
        })
      }

      const computedStats = {
        sessions: sessions || 0,
        streak,
        maxSteps,
        stepsGoalReached,
        weightGoalReached,
        totalVolume,
        recordBeaten,
        meals: mealEntries?.length || 0,
        weightEntries: weightEntries?.length || 0,
      }

      setStats(computedStats)
      setLoading(false)

      // Détecter les nouvelles médailles
      const nowUnlocked = MEDALS.filter(m => m.check(computedStats))
      const newOnes = nowUnlocked.filter(m => !seenIds.includes(m.id))

      if (newOnes.length > 0) {
        setNewMedalsQueue(newOnes)
        localStorage.setItem(seenKey, JSON.stringify(nowUnlocked.map(m => m.id)))
      } else {
        localStorage.setItem(seenKey, JSON.stringify(nowUnlocked.map(m => m.id)))
      }
    }
    fetchStats()
  }, [])

  const dismissModal = () => {
    setNewMedalsQueue(prev => prev.slice(1))
  }

  if (loading) return <p className="text-gray-400 text-sm">Chargement des médailles...</p>
  if (!stats) return null

  const unlocked = MEDALS.filter(m => m.check(stats))
  const locked = MEDALS.filter(m => !m.check(stats))

  return (
    <>
      {/* Modal nouvelle médaille */}
      {newMedalsQueue.length > 0 && (
        <MedalUnlockModal medal={newMedalsQueue[0]} onClose={dismissModal} />
      )}

      <div className="bg-gray-900 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">Médailles</h2>
          <span className="text-indigo-400 text-sm font-medium">{unlocked.length} / {MEDALS.length}</span>
        </div>

        {/* Barre de progression globale */}
        <div className="mb-4">
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{ width: `${Math.round((unlocked.length / MEDALS.length) * 100)}%` }}
            />
          </div>
          <p className="text-gray-600 text-xs mt-1">{Math.round((unlocked.length / MEDALS.length) * 100)}% complété</p>
        </div>

        {/* Débloquées */}
        {unlocked.length > 0 && (
          <div className="flex flex-col gap-2 mb-4">
            {unlocked.map(medal => (
              <div key={medal.id} className="flex items-center gap-3 bg-indigo-950/60 border border-indigo-500/20 rounded-xl px-4 py-3">
                <span className="text-2xl">{medal.emoji}</span>
                <div className="flex-1">
                  <p className="text-white font-medium text-sm">{medal.name}</p>
                  <p className="text-indigo-300 text-xs">{medal.description}</p>
                </div>
                <span className="text-indigo-400 text-xs">✓</span>
              </div>
            ))}
          </div>
        )}

        {/* Verrouillées */}
        {locked.length > 0 && (
          <div className="flex flex-col gap-2">
            {locked.map(medal => (
              <div key={medal.id} className="flex items-center gap-3 bg-gray-800/50 rounded-xl px-4 py-3 opacity-40">
                <span className="text-2xl grayscale">{medal.emoji}</span>
                <div className="flex-1">
                  <p className="text-gray-400 font-medium text-sm">{medal.name}</p>
                  <p className="text-gray-500 text-xs">{medal.description}</p>
                </div>
                <span className="text-gray-600 text-xs">🔒</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
      `}</style>
    </>
  )
}
