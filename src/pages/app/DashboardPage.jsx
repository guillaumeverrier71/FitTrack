import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { cache } from '../../lib/cache'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { useToast } from '../../context/ToastContext'
import { handleSupabaseError } from '../../lib/handleError'
import { useLang } from '../../context/LangContext'
import { Footprints, Dumbbell, Flame, Scale, Zap, CalendarDays } from 'lucide-react'


function getToday() {
  return new Date().toISOString().split('T')[0]
}

function getMondayOfWeek() {
  const today = new Date()
  const day = today.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff)
  return monday.toISOString().split('T')[0]
}

const CACHE_KEY = 'dashboard'

export default function DashboardPage() {
  const toast = useToast()
  const isOnline = useOnlineStatus()
  const { t, lang } = useLang()
  const [user, setUser] = useState(null)
  const [steps, setSteps] = useState(null)
  const [lastSession, setLastSession] = useState(null)
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)
  const [weightData, setWeightData] = useState(null)
  const [caloriesData, setCaloriesData] = useState(null)
  const [weekSummary, setWeekSummary] = useState(null)
  const [fromCache, setFromCache] = useState(false)

  const locale = lang === 'fr' ? 'fr-FR' : 'en-US'

  function timeAgo(dateStr) {
    if (!dateStr) return null
    const diff = Math.floor((new Date() - new Date(dateStr)) / 1000 / 60)
    if (diff < 60) return t('dashboard.timeAgoMin', { n: diff })
    if (diff < 1440) return t('dashboard.timeAgoH', { n: Math.floor(diff / 60) })
    return t('dashboard.timeAgoDays', { n: Math.floor(diff / 1440) })
  }

  useEffect(() => {
    // Offline : charger depuis le cache
    if (!isOnline) {
      const cached = cache.get(CACHE_KEY)
      if (cached) {
        setUser(cached.user)
        setSteps(cached.steps)
        setLastSession(cached.lastSession)
        setStreak(cached.streak)
        setWeightData(cached.weightData)
        setCaloriesData(cached.caloriesData)
        setWeekSummary(cached.weekSummary)
        setFromCache(true)
      }
      setLoading(false)
      return
    }

    const fetchAll = async () => {
      try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) { await handleSupabaseError(authError, toast); setLoading(false); return }
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

      // (caloriesDataValue est construit plus bas avant le cache.set)


      // Pas du jour
      const { data: stepsData } = await supabase
        .from('daily_steps')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', getToday())
        .maybeSingle()
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

      let streakCount = 0
      if (allSessions?.length) {
        const uniqueDays = [...new Set(
          allSessions.map(s => s.finished_at.split('T')[0])
        )]
        let current = new Date()
        for (const day of uniqueDays) {
          const d = new Date(day)
          const diff = Math.floor((current - d) / 1000 / 60 / 60 / 24)
          if (diff <= 1) { streakCount++; current = d }
          else break
        }
        setStreak(streakCount)
      }

      // Dernier poids
      const { data: weightEntries } = await supabase
        .from('weight_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(2)

      let weightDataValue = null
      if (weightEntries?.length > 0) {
        const latest = weightEntries[0]
        const previous = weightEntries[1]
        const diff = previous ? (latest.weight_kg - previous.weight_kg).toFixed(1) : null
        weightDataValue = { latest, diff }
        setWeightData(weightDataValue)
      }

      // Résumé hebdomadaire
      const monday = getMondayOfWeek()
      const { data: weekSessions } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('user_id', user.id)
        .not('finished_at', 'is', null)
        .gte('finished_at', monday)

      const { data: weekMeals } = await supabase
        .from('meal_entries')
        .select('calories, date')
        .eq('user_id', user.id)
        .gte('date', monday)

      const { data: weekSteps } = await supabase
        .from('daily_steps')
        .select('steps')
        .eq('user_id', user.id)
        .gte('date', monday)

      // Avg calories: sum / number of distinct days with entries
      const mealsByDay = (weekMeals || []).reduce((acc, m) => {
        acc[m.date] = (acc[m.date] || 0) + m.calories
        return acc
      }, {})
      const mealDays = Object.keys(mealsByDay)
      const avgCals = mealDays.length > 0
        ? Math.round(Object.values(mealsByDay).reduce((s, c) => s + c, 0) / mealDays.length)
        : null

      const avgSteps = weekSteps?.length > 0
        ? Math.round(weekSteps.reduce((s, d) => s + d.steps, 0) / weekSteps.length)
        : null

      const weekSummaryData = {
        sessions: weekSessions?.length || 0,
        avgCals,
        avgSteps,
      }
      setWeekSummary(weekSummaryData)

      const caloriesDataValue = {
        ingested: totalIngested,
        burned: totalBurned,
        net: totalIngested - totalBurned,
        goal: calorieProfile?.calorie_goal || null,
      }
      setCaloriesData(caloriesDataValue)

      // Sauvegarder dans le cache pour le mode offline
      cache.set(CACHE_KEY, {
        user,
        steps: stepsData || null,
        lastSession: sessions?.[0] || null,
        streak: streakCount,
        weightData: weightDataValue,
        caloriesData: caloriesDataValue,
        weekSummary: weekSummaryData,
      })

      setLoading(false)
      } catch (err) {
        await handleSupabaseError(err, toast, 'Erreur lors du chargement du tableau de bord.')
        setLoading(false)
      }
    }
    fetchAll()
  }, [isOnline])

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-gray-950">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const stepsProgress = steps ? Math.min((steps.steps / steps.goal) * 100, 100) : 0
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'Toi'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? t('dashboard.greetingMorning') : hour < 18 ? t('dashboard.greetingAfternoon') : t('dashboard.greetingEvening')

  return (
    <div className="p-4 pb-24 bg-gray-950 min-h-screen flex flex-col gap-4">

      {/* Header */}
      <div className="pt-2">
        <h1 className="text-2xl font-bold text-white">{greeting} {firstName} 👋</h1>
        <p className="text-gray-400 text-sm mt-1">
          {fromCache ? t('dashboard.fromCache') : t('dashboard.subtitle')}
        </p>
      </div>

      {/* Streak */}
      {streak > 0 && (
        <div className="bg-gradient-to-r from-orange-600 to-orange-500 rounded-2xl p-4 flex items-center gap-3">
          <Zap size={28} className="text-white" fill="white" />
          <div>
            <p className="text-white font-bold text-lg">
              {t('dashboard.streakCard', { n: streak, s: streak > 1 ? 's' : '' })}
            </p>
            <p className="text-orange-100 text-sm">{t('dashboard.streakMotiv')}</p>
          </div>
        </div>
      )}

      {/* Résumé semaine */}
      {weekSummary && (
        <div className="bg-gray-900 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays size={18} className="text-indigo-400" />
            <span className="text-gray-400 text-sm">{t('dashboard.thisWeek')}</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-white font-bold text-2xl">{weekSummary.sessions}</p>
              <p className="text-gray-500 text-xs mt-1">
                {t('dashboard.weekSessions', { s: weekSummary.sessions > 1 ? 's' : '' })}
              </p>
            </div>
            <div className="bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-white font-bold text-2xl">
                {weekSummary.avgCals !== null ? weekSummary.avgCals : '—'}
              </p>
              <p className="text-gray-500 text-xs mt-1">{t('dashboard.weekAvgCals')}</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-white font-bold text-2xl">
                {weekSummary.avgSteps !== null ? weekSummary.avgSteps.toLocaleString(locale) : '—'}
              </p>
              <p className="text-gray-500 text-xs mt-1">{t('dashboard.weekAvgSteps')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Pas du jour */}
      <div className="bg-gray-900 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Footprints size={18} className="text-indigo-400" />
          <span className="text-gray-400 text-sm">{t('dashboard.stepsToday')}</span>
        </div>
        {steps ? (
          <>
            <div className="flex items-end gap-2 mb-3">
              <span className="text-4xl font-bold text-white">
                {steps.steps.toLocaleString(locale)}
              </span>
              <span className="text-gray-400 mb-1 text-sm">/ {steps.goal.toLocaleString(locale)}</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2 mb-3">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${stepsProgress}%` }}
              />
            </div>
            <p className="text-gray-400 text-sm">
              {stepsProgress >= 100
                ? t('dashboard.stepsGoalReached')
                : t('dashboard.stepsProgress', { pct: Math.round(stepsProgress), remaining: (steps.goal - steps.steps).toLocaleString(locale) })
              }
            </p>
          </>
        ) : (
          <p className="text-gray-500 text-sm">{t('dashboard.noSteps')}</p>
        )}
      </div>

      {/* Dernière séance */}
      <div className="bg-gray-900 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Dumbbell size={18} className="text-indigo-400" />
          <span className="text-gray-400 text-sm">{t('dashboard.lastSession')}</span>
        </div>
        {lastSession ? (
          <div>
            <p className="text-white font-semibold text-lg">{lastSession.workout_templates?.name}</p>
            <p className="text-gray-400 text-sm mt-1">{timeAgo(lastSession.finished_at)}</p>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">{t('dashboard.noSession')}</p>
        )}
      </div>

      {/* Calories — placeholder */}
      <div className="bg-gray-900 rounded-2xl p-5">
        <div className="bg-gray-900 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Flame size={18} className="text-orange-400" />
            <span className="text-gray-400 text-sm">{t('dashboard.caloriesCard')}</span>
          </div>
          {caloriesData ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <div className="text-center">
                  <p className="text-white font-bold text-xl">{caloriesData.ingested}</p>
                  <p className="text-gray-500 text-xs mt-1">{t('dashboard.ingested')}</p>
                </div>
                <div className="text-gray-600 text-lg">−</div>
                <div className="text-center">
                  <p className="text-orange-400 font-bold text-xl">{caloriesData.burned}</p>
                  <p className="text-gray-500 text-xs mt-1">{t('dashboard.burned')}</p>
                </div>
                <div className="text-gray-600 text-lg">=</div>
                <div className="text-center">
                  <p className={`font-bold text-xl ${
                    caloriesData.goal && caloriesData.net > caloriesData.goal
                      ? 'text-red-400' : 'text-white'
                  }`}>{caloriesData.net}</p>
                  <p className="text-gray-500 text-xs mt-1">{t('dashboard.net')}</p>
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
                  <p className="text-gray-500 text-xs">{t('dashboard.calorieGoal', { n: caloriesData.goal })}</p>
                </>
              )}
            </>
          ) : (
            <p className="text-gray-500 text-sm">{t('dashboard.noCalories')}</p>
          )}
        </div>
      </div>

      {/* Poids — placeholder */}
      <div className="bg-gray-900 rounded-2xl p-5">
        <div className="bg-gray-900 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
                <Scale size={18} className="text-green-400" />
                <span className="text-gray-400 text-sm">{t('dashboard.currentWeight')}</span>
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
                <p className="text-gray-500 text-sm">{t('dashboard.noWeight')}</p>
            )}
            </div>
      </div>

    </div>
  )
}
