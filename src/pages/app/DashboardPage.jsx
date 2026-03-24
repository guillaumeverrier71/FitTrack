import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Footprints, Dumbbell, Flame, Scale, Zap } from 'lucide-react'

const CALORIES_PER_STEP = 0.04

function getToday() {
  return new Date().toISOString().split('T')[0]
}

function timeAgo(dateStr) {
  if (!dateStr) return null
  const diff = Math.floor((new Date() - new Date(dateStr)) / 1000 / 60)
  if (diff < 60) return `Il y a ${diff} min`
  if (diff < 1440) return `Il y a ${Math.floor(diff / 60)}h`
  return `Il y a ${Math.floor(diff / 1440)} jour(s)`
}

export default function DashboardPage() {
  const [user, setUser] = useState(null)
  const [steps, setSteps] = useState(null)
  const [lastSession, setLastSession] = useState(null)
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)
  const [weightData, setWeightData] = useState(null)
  const [caloriesData, setCaloriesData] = useState(null)

  useEffect(() => {
    const fetchAll = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)


      // Calories du jour
      const { data: mealsToday } = await supabase
        .from('meal_entries')
        .select('calories')
        .eq('user_id', user.id)
        .eq('date', getToday())

      const { data: activitiesToday } = await supabase
        .from('activity_entries')
        .select('calories_burned')
        .eq('user_id', user.id)
        .eq('date', getToday())

      const { data: calorieProfile } = await supabase
        .from('user_profile')
        .select('calorie_goal')
        .eq('user_id', user.id)
        .single()

      const totalIngested = (mealsToday || []).reduce((s, m) => s + m.calories, 0)
      const totalBurned = (activitiesToday || []).reduce((s, a) => s + a.calories_burned, 0)

      setCaloriesData({
        ingested: totalIngested,
        burned: totalBurned,
        net: totalIngested - totalBurned,
        goal: calorieProfile?.calorie_goal || null,
      })


      // Pas du jour
      const { data: stepsData } = await supabase
        .from('daily_steps')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', getToday())
        .single()
      setSteps(stepsData)

      // Dernière séance
      const { data: sessions } = await supabase
        .from('workout_sessions')
        .select('*, workout_templates(name)')
        .eq('user_id', user.id)
        .not('finished_at', 'is', null)
        .order('finished_at', { ascending: false })
        .limit(1)
      setLastSession(sessions?.[0] || null)

      // Streak — nombre de jours consécutifs avec une séance
      const { data: allSessions } = await supabase
        .from('workout_sessions')
        .select('finished_at')
        .eq('user_id', user.id)
        .not('finished_at', 'is', null)
        .order('finished_at', { ascending: false })

      if (allSessions?.length) {
        const uniqueDays = [...new Set(
          allSessions.map(s => s.finished_at.split('T')[0])
        )]
        let count = 0
        let current = new Date()
        for (const day of uniqueDays) {
          const d = new Date(day)
          const diff = Math.floor((current - d) / 1000 / 60 / 60 / 24)
          if (diff <= 1) { count++; current = d }
          else break
        }
        setStreak(count)
      }

      // Dernier poids
        const { data: weightEntries } = await supabase
        .from('weight_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(2)

        if (weightEntries?.length > 0) {
        const latest = weightEntries[0]
        const previous = weightEntries[1]
        const diff = previous
            ? (latest.weight_kg - previous.weight_kg).toFixed(1)
            : null
        setWeightData({ latest, diff })
        }

      setLoading(false)
    }
    fetchAll()
  }, [])

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-gray-950">
      <p className="text-white">Chargement...</p>
    </div>
  )

  const stepsProgress = steps ? Math.min((steps.steps / steps.goal) * 100, 100) : 0
  const stepsCalories = steps ? Math.round(steps.steps * CALORIES_PER_STEP) : 0
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'Toi'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  return (
    <div className="p-4 pb-24 bg-gray-950 min-h-screen flex flex-col gap-4">

      {/* Header */}
      <div className="pt-2">
        <h1 className="text-2xl font-bold text-white">{greeting} 👋</h1>
        <p className="text-gray-400 text-sm mt-1">Voilà où t'en es aujourd'hui</p>
      </div>

      {/* Streak */}
      {streak > 0 && (
        <div className="bg-gradient-to-r from-orange-600 to-orange-500 rounded-2xl p-4 flex items-center gap-3">
          <Zap size={28} className="text-white" fill="white" />
          <div>
            <p className="text-white font-bold text-lg">{streak} jour{streak > 1 ? 's' : ''} de streak 🔥</p>
            <p className="text-orange-100 text-sm">Continue comme ça !</p>
          </div>
        </div>
      )}

      {/* Pas du jour */}
      <div className="bg-gray-900 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Footprints size={18} className="text-indigo-400" />
          <span className="text-gray-400 text-sm">Pas aujourd'hui</span>
        </div>
        {steps ? (
          <>
            <div className="flex items-end gap-2 mb-3">
              <span className="text-4xl font-bold text-white">
                {steps.steps.toLocaleString('fr-FR')}
              </span>
              <span className="text-gray-400 mb-1 text-sm">/ {steps.goal.toLocaleString('fr-FR')}</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2 mb-3">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${stepsProgress}%` }}
              />
            </div>
            <p className="text-gray-400 text-sm">
              {stepsProgress >= 100
                ? '✅ Objectif atteint !'
                : `${Math.round(stepsProgress)}% — encore ${(steps.goal - steps.steps).toLocaleString('fr-FR')} pas`
              }
            </p>
          </>
        ) : (
          <p className="text-gray-500 text-sm">Aucun pas enregistré aujourd'hui</p>
        )}
      </div>

      {/* Dernière séance */}
      <div className="bg-gray-900 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Dumbbell size={18} className="text-indigo-400" />
          <span className="text-gray-400 text-sm">Dernière séance</span>
        </div>
        {lastSession ? (
          <div>
            <p className="text-white font-semibold text-lg">{lastSession.workout_templates?.name}</p>
            <p className="text-gray-400 text-sm mt-1">{timeAgo(lastSession.finished_at)}</p>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Aucune séance effectuée</p>
        )}
      </div>

      {/* Calories — placeholder */}
      <div className="bg-gray-900 rounded-2xl p-5">
        <div className="bg-gray-900 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Flame size={18} className="text-orange-400" />
            <span className="text-gray-400 text-sm">Calories du jour</span>
          </div>
          {caloriesData ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <div className="text-center">
                  <p className="text-white font-bold text-xl">{caloriesData.ingested}</p>
                  <p className="text-gray-500 text-xs mt-1">Ingérées</p>
                </div>
                <div className="text-gray-600 text-lg">−</div>
                <div className="text-center">
                  <p className="text-orange-400 font-bold text-xl">{caloriesData.burned}</p>
                  <p className="text-gray-500 text-xs mt-1">Dépensées</p>
                </div>
                <div className="text-gray-600 text-lg">=</div>
                <div className="text-center">
                  <p className={`font-bold text-xl ${
                    caloriesData.goal && caloriesData.net > caloriesData.goal
                      ? 'text-red-400' : 'text-white'
                  }`}>{caloriesData.net}</p>
                  <p className="text-gray-500 text-xs mt-1">Net</p>
                </div>
              </div>
              {caloriesData.goal && (
                <>
                  <div className="w-full bg-gray-800 rounded-full h-2 mb-1">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        caloriesData.net > caloriesData.goal ? 'bg-red-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min((caloriesData.net / caloriesData.goal) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-gray-500 text-xs">Objectif : {caloriesData.goal} kcal</p>
                </>
              )}
            </>
          ) : (
            <p className="text-gray-500 text-sm">Aucun repas enregistré aujourd'hui</p>
          )}
        </div>
      </div>

      {/* Poids — placeholder */}
      <div className="bg-gray-900 rounded-2xl p-5">
        <div className="bg-gray-900 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
                <Scale size={18} className="text-green-400" />
                <span className="text-gray-400 text-sm">Poids actuel</span>
            </div>
            {weightData ? (
                <div className="flex items-end gap-3">
                <div>
                    <span className="text-4xl font-bold text-white">{weightData.latest.weight_kg}</span>
                    <span className="text-gray-400 text-xl ml-1">kg</span>
                </div>
                {weightData.diff !== null && (
                    <p className={`mb-1 text-sm font-medium ${
                    parseFloat(weightData.diff) < 0 ? 'text-green-400' :
                    parseFloat(weightData.diff) > 0 ? 'text-red-400' :
                    'text-gray-400'
                    }`}>
                    {parseFloat(weightData.diff) > 0 ? '+' : ''}{weightData.diff} kg
                    </p>
                )}
                </div>
            ) : (
                <p className="text-gray-500 text-sm">Aucune pesée enregistrée</p>
            )}
            </div>
      </div>

    </div>
  )
}