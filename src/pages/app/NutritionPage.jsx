import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, Trash2, Flame, Target, X, Settings2, PenLine, Copy } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import FoodSearch from '../../components/nutrition/FoodSearch'
import ConfirmModal from '../../components/ui/ConfirmModal'
import { useToast } from '../../context/ToastContext'
import { handleSupabaseError } from '../../lib/handleError'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { offlineQueue } from '../../lib/offlineQueue'
import { useLang } from '../../context/LangContext'
import { useUnits } from '../../context/UnitContext'

const CATEGORIES = ['petit-déj', 'déjeuner', 'dîner', 'snack']
const ACTIVITY_LEVELS = {
  sedentaire: { multiplier: 1.2 },
  leger: { multiplier: 1.375 },
  modere: { multiplier: 1.55 },
  actif: { multiplier: 1.725 },
  tres_actif: { multiplier: 1.9 },
}

function getToday() {
  return new Date().toISOString().split('T')[0]
}

function formatDate(dateStr, locale) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString(locale, { weekday: 'short' })
}

function calculateTDEE(profile) {
  if (!profile?.height_cm || !profile?.age || !profile?.gender) return null
  const weight = profile.current_weight || profile.weight_goal_kg
  if (!weight) return null
  let bmr
  if (profile.gender === 'homme') {
    bmr = 88.362 + (13.397 * weight) + (4.799 * profile.height_cm) - (5.677 * profile.age)
  } else {
    bmr = 447.593 + (9.247 * weight) + (3.098 * profile.height_cm) - (4.330 * profile.age)
  }
  const multiplier = ACTIVITY_LEVELS[profile.activity_level]?.multiplier || 1.55
  return Math.round(bmr * multiplier)
}

export default function NutritionPage() {
  const toast = useToast()
  const isOnline = useOnlineStatus()
  const { t, lang } = useLang()
  const { fmtEnergy, energyLabel } = useUnits()
  const locale = lang === 'fr' ? 'fr-FR' : 'en-US'
  const [meals, setMeals] = useState([])
  const [activities, setActivities] = useState([])
  const [stepsToday, setStepsToday] = useState(0)
  const [profile, setProfile] = useState(null)
  const [currentWeight, setCurrentWeight] = useState(null)
  const [weekData, setWeekData] = useState([])
  const [showMealForm, setShowMealForm] = useState(false)
  const [showActivityForm, setShowActivityForm] = useState(false)
  const [showProfileForm, setShowProfileForm] = useState(false)
  const [activeMealCat, setActiveMealCat] = useState('déjeuner')
  const [loading, setLoading] = useState(true)

  const [actName, setActName] = useState('')
  const [actCals, setActCals] = useState('')
  const [actDuration, setActDuration] = useState('')

  const [confirmDelete, setConfirmDelete] = useState(null) // { id, type: 'meal' | 'activity' }
  const [copyingYesterday, setCopyingYesterday] = useState(false)
  const [showManualForm, setShowManualForm] = useState(false)
  const [manualCat, setManualCat] = useState('déjeuner')
  const [manName, setManName] = useState('')
  const [manCals, setManCals] = useState('')
  const [manProteins, setManProteins] = useState('')
  const [manCarbs, setManCarbs] = useState('')
  const [manFats, setManFats] = useState('')
  const [profAge, setProfAge] = useState('')
  const [profGender, setProfGender] = useState('homme')
  const [profActivity, setProfActivity] = useState('modere')
  const [profGoalCals, setProfGoalCals] = useState('')
  const [profProteinsGoal, setProfProteinsGoal] = useState('')
  const [profCarbsGoal, setProfCarbsGoal] = useState('')
  const [profFatsGoal, setProfFatsGoal] = useState('')

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const today = getToday()

      const dates = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        dates.push(d.toISOString().split('T')[0])
      }

      const [
        { data: mealsData },
        { data: activitiesData },
        { data: profileData },
        { data: weightData },
        { data: stepsData },
        { data: weekMeals },
        { data: weekActs },
      ] = await Promise.all([
        supabase.from('meal_entries').select('*').eq('user_id', user.id).eq('date', today).order('created_at'),
        supabase.from('activity_entries').select('*').eq('user_id', user.id).eq('date', today).order('created_at'),
        supabase.from('user_profile').select('*').eq('user_id', user.id).single(),
        supabase.from('weight_entries').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(1),
        supabase.from('daily_steps').select('steps').eq('user_id', user.id).eq('date', today).maybeSingle(),
        supabase.from('meal_entries').select('date, calories').eq('user_id', user.id).in('date', dates),
        supabase.from('activity_entries').select('date, calories_burned').eq('user_id', user.id).in('date', dates),
      ])

      setMeals(mealsData || [])
      setActivities(activitiesData || [])
      setStepsToday(stepsData?.steps || 0)
      setProfile(profileData)
      setCurrentWeight(weightData?.[0]?.weight_kg || null)
      setProfAge(profileData?.age?.toString() || '')
      setProfGender(profileData?.gender || 'homme')
      setProfActivity(profileData?.activity_level || 'modere')
      setProfGoalCals(profileData?.calorie_goal?.toString() || '')
      setProfProteinsGoal(profileData?.proteins_goal_g?.toString() || '')
      setProfCarbsGoal(profileData?.carbs_goal_g?.toString() || '')
      setProfFatsGoal(profileData?.fats_goal_g?.toString() || '')

      const mapped = dates.map(date => ({
        date,
        label: formatDate(date, locale),
        ingested: (weekMeals || []).filter(m => m.date === date).reduce((s, m) => s + m.calories, 0),
        burned: (weekActs || []).filter(a => a.date === date).reduce((s, a) => s + a.calories_burned, 0),
        isToday: date === today,
      }))

      setWeekData(mapped)
      setLoading(false)
    } catch (err) {
      await handleSupabaseError(err, toast, 'Erreur de chargement.')
    }
  }

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    const handler = () => fetchData()
    window.addEventListener('bp-sync-complete', handler)
    return () => window.removeEventListener('bp-sync-complete', handler)
  }, [])

  const handleAddMeal = async (foodData) => {
    try {
      if (!isOnline) {
        const { data: { user } } = await supabase.auth.getUser()
        const offlineId = `offline_${Date.now()}`
        const qId = offlineQueue.add('insert', 'meal_entries', {
          user_id: user.id,
          date: getToday(),
          name: foodData.name,
          calories: foodData.calories,
          proteins: foodData.proteins || 0,
          carbs: foodData.carbs || 0,
          fats: foodData.fats || 0,
          quantity_g: foodData.quantity_g || 100,
          food_id: foodData.food_id || null,
          category: foodData.category,
        })
        setMeals(prev => [...prev, { id: offlineId, _queueId: qId, name: foodData.name, calories: foodData.calories, proteins: foodData.proteins || 0, carbs: foodData.carbs || 0, fats: foodData.fats || 0, category: foodData.category }])
        setShowMealForm(false)
        toast.info(t('nutrition.addedOffline') || t('layout.offlineCache'))
        return
      }
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('meal_entries').insert({
        user_id: user.id,
        date: getToday(),
        name: foodData.name,
        calories: foodData.calories,
        proteins: foodData.proteins || 0,
        carbs: foodData.carbs || 0,
        fats: foodData.fats || 0,
        quantity_g: foodData.quantity_g || 100,
        food_id: foodData.food_id || null,
        category: foodData.category,
      })
      setShowMealForm(false)
      toast.success(t('nutrition.mealAdded'))
      fetchData()
    } catch (err) {
      await handleSupabaseError(err, toast, t('nutrition.mealAdded'))
    }
  }

  const handleAddActivity = async () => {
    try {
      if (!isOnline) {
        const { data: { user } } = await supabase.auth.getUser()
        const offlineId = `offline_${Date.now()}`
        const qId = offlineQueue.add('insert', 'activity_entries', {
          user_id: user.id,
          date: getToday(),
          name: actName.trim(),
          calories_burned: parseInt(actCals),
          duration_minutes: parseInt(actDuration) || null,
        })
        setActivities(prev => [...prev, { id: offlineId, _queueId: qId, name: actName.trim(), calories_burned: parseInt(actCals), duration_minutes: parseInt(actDuration) || null }])
        setActName(''); setActCals(''); setActDuration('')
        setShowActivityForm(false)
        toast.info(t('layout.offlineCache'))
        return
      }
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('activity_entries').insert({
        user_id: user.id,
        date: getToday(),
        name: actName.trim(),
        calories_burned: parseInt(actCals),
        duration_minutes: parseInt(actDuration) || null,
      })
      setActName(''); setActCals(''); setActDuration('')
      setShowActivityForm(false)
      toast.success(t('nutrition.activityAdded'))
      fetchData()
    } catch (err) {
      await handleSupabaseError(err, toast, t('nutrition.activityAdded'))
    }
  }

  const handleSaveProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const tdee = calculateTDEE({
        weight_goal_kg: profile?.weight_goal_kg,
        height_cm: profile?.height_cm,
        age: parseInt(profAge),
        gender: profGender,
        activity_level: profActivity,
        current_weight: currentWeight,
      })
      await supabase.from('user_profile').upsert({
        user_id: user.id,
        height_cm: profile?.height_cm,
        weight_goal_kg: profile?.weight_goal_kg,
        age: parseInt(profAge) || null,
        gender: profGender,
        activity_level: profActivity,
        calorie_goal: profGoalCals ? parseInt(profGoalCals) : tdee,
        proteins_goal_g: profProteinsGoal ? parseInt(profProteinsGoal) : null,
        carbs_goal_g: profCarbsGoal ? parseInt(profCarbsGoal) : null,
        fats_goal_g: profFatsGoal ? parseInt(profFatsGoal) : null,
      }, { onConflict: 'user_id' })
      setShowProfileForm(false)
      toast.success(t('nutrition.goalUpdated'))
      fetchData()
    } catch (err) {
      await handleSupabaseError(err, toast, t('nutrition.goalUpdated'))
    }
  }

  const handleAddManual = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('meal_entries').insert({
        user_id: user.id,
        date: getToday(),
        name: manName.trim() || t('nutrition.manualEntry'),
        calories: parseInt(manCals) || 0,
        proteins: parseFloat(manProteins) || 0,
        carbs: parseFloat(manCarbs) || 0,
        fats: parseFloat(manFats) || 0,
        quantity_g: 100,
        category: manualCat,
      })
      setManName(''); setManCals(''); setManProteins(''); setManCarbs(''); setManFats('')
      setShowManualForm(false)
      toast.success(t('nutrition.added'))
      fetchData()
    } catch (err) {
      await handleSupabaseError(err, toast, t('nutrition.added'))
    }
  }

  const confirmDeleteAndExecute = async () => {
    if (!confirmDelete) return
    const { id, type } = confirmDelete
    setConfirmDelete(null)

    if (type === 'meal') {
      if (id.toString().startsWith('offline_')) {
        const meal = meals.find(m => m.id === id)
        if (meal?._queueId) offlineQueue.remove(meal._queueId)
        setMeals(prev => prev.filter(m => m.id !== id))
        return
      }
      if (!isOnline) {
        offlineQueue.add('delete', 'meal_entries', null, { match: { id } })
        setMeals(prev => prev.filter(m => m.id !== id))
        return
      }
      try {
        await supabase.from('meal_entries').delete().eq('id', id)
        fetchData()
      } catch (err) {
        await handleSupabaseError(err, toast, 'Erreur lors de la suppression.')
      }
    } else {
      if (id.toString().startsWith('offline_')) {
        const act = activities.find(a => a.id === id)
        if (act?._queueId) offlineQueue.remove(act._queueId)
        setActivities(prev => prev.filter(a => a.id !== id))
        return
      }
      if (!isOnline) {
        offlineQueue.add('delete', 'activity_entries', null, { match: { id } })
        setActivities(prev => prev.filter(a => a.id !== id))
        return
      }
      try {
        await supabase.from('activity_entries').delete().eq('id', id)
        fetchData()
      } catch (err) {
        await handleSupabaseError(err, toast, 'Erreur lors de la suppression.')
      }
    }
  }

  const handleCopyYesterday = async () => {
    setCopyingYesterday(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]
      const { data: yesterdayMeals } = await supabase
        .from('meal_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', yesterdayStr)
      if (!yesterdayMeals?.length) {
        toast.info(t('nutrition.copyEmpty'))
        return
      }
      await supabase.from('meal_entries').insert(
        yesterdayMeals.map(({ id, created_at, ...m }) => ({ ...m, date: getToday() }))
      )
      toast.success(t('nutrition.copySuccess', { n: yesterdayMeals.length }))
      fetchData()
    } catch (err) {
      await handleSupabaseError(err, toast, 'Erreur lors de la copie.')
    } finally {
      setCopyingYesterday(false)
    }
  }

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-gray-950">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const totalIngested = meals.reduce((s, m) => s + m.calories, 0)
  const CALORIES_PER_STEP = 0.04
  const stepsCalories = Math.round((stepsToday || 0) * CALORIES_PER_STEP)
  const totalBurned = activities.reduce((s, a) => s + a.calories_burned, 0) + stepsCalories
  const totalProteins = Math.round(meals.reduce((s, m) => s + (m.proteins || 0), 0))
  const totalCarbs = Math.round(meals.reduce((s, m) => s + (m.carbs || 0), 0))
  const totalFats = Math.round(meals.reduce((s, m) => s + (m.fats || 0), 0))
  const netCalories = totalIngested - totalBurned

  const tdee = calculateTDEE({ ...profile, current_weight: currentWeight })
  const calorieGoal = profile?.calorie_goal || tdee
  const macroGoals = (calorieGoal || profile?.proteins_goal_g) ? {
    proteins: profile?.proteins_goal_g || Math.round(calorieGoal * 0.30 / 4),
    carbs: profile?.carbs_goal_g || Math.round(calorieGoal * 0.45 / 4),
    fats: profile?.fats_goal_g || Math.round(calorieGoal * 0.25 / 9),
  } : null

  const CAT_LABELS = {
    'petit-déj': t('nutrition.catBreakfast'),
    'déjeuner': t('nutrition.catLunch'),
    'dîner': t('nutrition.catDinner'),
    'snack': t('nutrition.catSnack'),
  }

  const byCategory = CATEGORIES.map(cat => ({
    cat,
    label: CAT_LABELS[cat] || cat,
    total: meals.filter(m => m.category === cat).reduce((s, m) => s + m.calories, 0),
    items: meals.filter(m => m.category === cat),
  }))

  return (
    <div className="p-4 pb-24 bg-gray-950 min-h-screen flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{t('nav.nutrition')}</h1>
        <button
          onClick={() => setShowProfileForm(true)}
          className="flex items-center gap-2 bg-gray-900 border border-gray-800 hover:border-indigo-500/50 text-gray-400 hover:text-white px-4 py-2.5 rounded-xl transition-all"
        >
          <Settings2 size={15} className="text-indigo-400 shrink-0" />
          <span className="text-sm font-medium">
            {calorieGoal ? fmtEnergy(calorieGoal) : t('common.goal')}
          </span>
        </button>
      </div>

      {/* Balance du jour */}
      <div className="bg-gray-900 rounded-2xl p-5">
        <p className="text-gray-400 text-sm mb-3">{t('dashboard.caloriesCard')}</p>
        <div className="flex items-center justify-between mb-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">{fmtEnergy(totalIngested)}</p>
            <p className="text-gray-500 text-xs mt-1">{t('dashboard.ingested')}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-400">{fmtEnergy(totalBurned)}</p>
            <p className="text-gray-500 text-xs mt-1">{t('dashboard.burned')}</p>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-bold ${calorieGoal && netCalories > calorieGoal ? 'text-red-400' : 'text-white'}`}>
              {fmtEnergy(netCalories)}
            </p>
            <p className="text-gray-500 text-xs mt-1">{t('dashboard.net')}</p>
          </div>
        </div>

        {calorieGoal && (
          <>
            <div className="w-full bg-gray-800 rounded-full h-2 mb-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${netCalories > calorieGoal ? 'bg-red-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min((netCalories / calorieGoal) * 100, 100)}%` }}
              />
            </div>
            <p className="text-gray-500 text-xs mb-3">{t('nutrition.calorieGoalFmt', { energy: fmtEnergy(calorieGoal) })}</p>
          </>
        )}

        <div className="flex flex-col gap-2">
          {[
            { label: t('nutrition.proteins'), value: totalProteins, goal: macroGoals?.proteins, color: 'bg-blue-500', text: 'text-blue-400' },
            { label: t('nutrition.carbs'), value: totalCarbs, goal: macroGoals?.carbs, color: 'bg-yellow-500', text: 'text-yellow-400' },
            { label: t('nutrition.fats'), value: totalFats, goal: macroGoals?.fats, color: 'bg-red-500', text: 'text-red-400' },
          ].map(({ label, value, goal, color, text }) => (
            <div key={label} className="bg-gray-800 rounded-xl px-3 py-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-400 text-xs">{label}</span>
                <span className={`${text} text-xs font-medium`}>
                  {value}g{goal ? ` / ${goal}g` : ''}
                </span>
              </div>
              {goal ? (
                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min((value / goal) * 100, 100)}%` }} />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {/* Repas par catégorie */}
      <div className="bg-gray-900 rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold">{t('nutrition.meals')}</h2>
          <button
            onClick={handleCopyYesterday}
            disabled={copyingYesterday}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <Copy size={13} />
            {copyingYesterday ? t('common.loading') : t('nutrition.copyYesterday')}
          </button>
        </div>
        {byCategory.map(({ cat, label, total, items }) => (
          <div key={cat}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm capitalize">{label}</span>
              <div className="flex items-center gap-2">
                {total > 0 && <span className="text-gray-400 text-sm">{fmtEnergy(total)}</span>}
                <button
                  onClick={() => { setManualCat(cat); setShowManualForm(true) }}
                  className="bg-gray-700 hover:bg-gray-600 text-gray-300 p-1 rounded-lg transition-colors"
                  title={t('nutrition.manualEntry')}
                >
                  <PenLine size={16} />
                </button>
                <button
                  onClick={() => { setActiveMealCat(cat); setShowMealForm(true) }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white p-1 rounded-lg transition-colors"
                  title={t('nutrition.foodSearch')}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
            {items.length > 0 ? (
              <div className="flex flex-col gap-2">
                {items.map(meal => (
                  <div key={meal.id} className="flex flex-col bg-gray-800 rounded-xl px-3 py-2 gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-white text-sm">{meal.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-orange-400 text-sm font-medium">{fmtEnergy(meal.calories)}</span>
                        <button onClick={() => setConfirmDelete({ id: meal.id, type: 'meal' })} className="text-gray-500 hover:text-red-400 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {(meal.proteins > 0 || meal.carbs > 0 || meal.fats > 0) && (
                      <div className="flex gap-3">
                        <span className="text-blue-400 text-xs">{meal.proteins}g {t('nutrition.proteins').toLowerCase()}</span>
                        <span className="text-yellow-400 text-xs">{meal.carbs}g {t('nutrition.carbs').toLowerCase()}</span>
                        <span className="text-red-400 text-xs">{meal.fats}g {t('nutrition.fats').toLowerCase()}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-xs">{t('nutrition.noMeals')}</p>
            )}
          </div>
        ))}
      </div>

      {/* Activités */}
      <div className="bg-gray-900 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">{t('nutrition.activities')}</h2>
          <button
            onClick={() => setShowActivityForm(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white p-1.5 rounded-lg transition-colors"
          >
            <Plus size={18} />
          </button>
        </div>
        {activities.length === 0 && stepsCalories === 0 ? (
          <p className="text-gray-500 text-sm">{t('nutrition.noActivities')}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {activities.map(act => (
              <div key={act.id} className="flex items-center justify-between bg-gray-800 rounded-xl px-3 py-2">
                <div>
                  <span className="text-white text-sm">{act.name}</span>
                  {act.duration_minutes && <span className="text-gray-500 text-xs ml-2">{act.duration_minutes} min</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-green-400 text-sm font-medium">-{fmtEnergy(act.calories_burned)}</span>
                  <button onClick={() => setConfirmDelete({ id: act.id, type: 'activity' })} className="text-gray-500 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            {stepsCalories > 0 && (
              <div className="flex items-center justify-between bg-gray-800 rounded-xl px-3 py-2">
                <div>
                  <span className="text-white text-sm">{t('nutrition.stepsActivity')}</span>
                  <span className="text-gray-500 text-xs ml-2">{stepsToday.toLocaleString()} {t('dashboard.steps')}</span>
                </div>
                <span className="text-green-400 text-sm font-medium">-{fmtEnergy(stepsCalories)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Graphique semaine */}
      <div className="bg-gray-900 rounded-2xl p-5">
        <h2 className="text-white font-semibold mb-4">{t('dashboard.thisWeek')}</h2>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={weekData} barSize={24}>
            <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '12px' }}
              formatter={(value) => [fmtEnergy(value), t('dashboard.ingested')]}
            />
            <Bar dataKey="ingested" radius={[6, 6, 0, 0]}>
              {weekData.map((entry, i) => (
                <Cell key={i} fill={entry.isToday ? '#6366f1' : '#374151'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Modal recherche aliment */}
      {showMealForm && (
        <FoodSearch
          category={activeMealCat}
          onAdd={handleAddMeal}
          onClose={() => setShowMealForm(false)}
        />
      )}

      {/* Modal saisie manuelle */}
      {showManualForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end" onClick={() => setShowManualForm(false)}>
          <div className="bg-gray-900 w-full rounded-t-3xl p-6 flex flex-col gap-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-white font-semibold">{t('nutrition.manualEntry')}</h2>
                <p className="text-gray-500 text-xs capitalize">{CAT_LABELS[manualCat] || manualCat}</p>
              </div>
              <button onClick={() => setShowManualForm(false)}><X size={22} className="text-gray-400" /></button>
            </div>

            <input
              type="text"
              placeholder={t('nutrition.manualName')}
              value={manName}
              onChange={e => setManName(e.target.value)}
              className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />

            <div>
              <label className="text-gray-400 text-xs mb-1 block">{t('nutrition.manualCals')}</label>
              <input
                type="number"
                placeholder={t('nutrition.agePlaceholder') || 'ex: 350'}
                value={manCals}
                onChange={e => setManCals(e.target.value)}
                className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 w-full"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-blue-400 text-xs mb-1 block">{t('nutrition.manualProteins')}</label>
                <input
                  type="number"
                  placeholder="0"
                  value={manProteins}
                  onChange={e => setManProteins(e.target.value)}
                  className="bg-gray-800 text-white rounded-xl px-3 py-3 outline-none focus:ring-2 focus:ring-blue-500 w-full text-center"
                />
              </div>
              <div>
                <label className="text-yellow-400 text-xs mb-1 block">{t('nutrition.manualCarbs')}</label>
                <input
                  type="number"
                  placeholder="0"
                  value={manCarbs}
                  onChange={e => setManCarbs(e.target.value)}
                  className="bg-gray-800 text-white rounded-xl px-3 py-3 outline-none focus:ring-2 focus:ring-yellow-500 w-full text-center"
                />
              </div>
              <div>
                <label className="text-red-400 text-xs mb-1 block">{t('nutrition.manualFats')}</label>
                <input
                  type="number"
                  placeholder="0"
                  value={manFats}
                  onChange={e => setManFats(e.target.value)}
                  className="bg-gray-800 text-white rounded-xl px-3 py-3 outline-none focus:ring-2 focus:ring-red-500 w-full text-center"
                />
              </div>
            </div>

            <button
              onClick={handleAddManual}
              disabled={!manCals}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {t('nutrition.addMeal')}
            </button>
          </div>
        </div>
      )}

      {/* Modal activité */}
      {showActivityForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end">
          <div className="bg-gray-900 w-full rounded-t-3xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold">{t('nutrition.addActivity')}</h2>
              <button onClick={() => setShowActivityForm(false)}><X size={22} className="text-gray-400" /></button>
            </div>
            <input type="text" placeholder={t('nutrition.activityName')} value={actName} onChange={e => setActName(e.target.value)}
              className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500" autoFocus />
            <input type="number" placeholder={t('nutrition.activityCals')} value={actCals} onChange={e => setActCals(e.target.value)}
              className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500" />
            <input type="number" placeholder={t('nutrition.activityDuration')} value={actDuration} onChange={e => setActDuration(e.target.value)}
              className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500" />
            <button onClick={handleAddActivity} disabled={!actName || !actCals}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors">
              {t('nutrition.addActivity')}
            </button>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal
          title={confirmDelete.type === 'meal' ? t('nutrition.deleteTitle') : t('nutrition.deleteTitle')}
          description={t('nutrition.deleteDesc')}
          confirmLabel={t('common.delete')}
          onConfirm={confirmDeleteAndExecute}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* Modal objectif calorique */}
      {showProfileForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end">
          <div className="bg-gray-900 w-full rounded-t-3xl p-6 flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold">{t('nutrition.caloricGoalTitle')}</h2>
              <button onClick={() => setShowProfileForm(false)}><X size={22} className="text-gray-400" /></button>
            </div>
            <p className="text-gray-400 text-sm">{t('nutrition.caloricGoalDesc')}</p>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">{t('nutrition.ageLabel')}</label>
              <input type="number" value={profAge} onChange={e => setProfAge(e.target.value)} placeholder={t('nutrition.agePlaceholder')}
                className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 w-full" />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">{t('nutrition.sexLabel')}</label>
              <div className="flex gap-2">
                {[['homme', t('common.male')], ['femme', t('common.female')]].map(([val, label]) => (
                  <button key={val} onClick={() => setProfGender(val)}
                    className={`flex-1 py-3 rounded-xl text-sm transition-colors ${profGender === val ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">{t('nutrition.activityLevel')}</label>
              <div className="flex flex-col gap-2">
                {Object.keys(ACTIVITY_LEVELS).map(key => (
                  <button key={key} onClick={() => setProfActivity(key)}
                    className={`py-3 px-4 rounded-xl text-sm text-left transition-colors ${profActivity === key ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
                    {t(`nutrition.actLevel${key.charAt(0).toUpperCase()}${key.slice(1)}`)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">{t('nutrition.manualGoalLabel')}</label>
              <input type="number" value={profGoalCals} onChange={e => setProfGoalCals(e.target.value)} placeholder={t('nutrition.manualGoalPlaceholder')}
                className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 w-full" />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-2 block">{t('nutrition.macroGoalHint')}</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-blue-400 text-xs mb-1 block">{t('nutrition.proteinsG')}</label>
                  <input type="number" value={profProteinsGoal} onChange={e => setProfProteinsGoal(e.target.value)} placeholder="150"
                    className="bg-gray-800 text-white rounded-xl px-3 py-3 outline-none focus:ring-2 focus:ring-blue-500 w-full text-sm" />
                </div>
                <div className="flex-1">
                  <label className="text-yellow-400 text-xs mb-1 block">{t('nutrition.carbsG')}</label>
                  <input type="number" value={profCarbsGoal} onChange={e => setProfCarbsGoal(e.target.value)} placeholder="250"
                    className="bg-gray-800 text-white rounded-xl px-3 py-3 outline-none focus:ring-2 focus:ring-yellow-500 w-full text-sm" />
                </div>
                <div className="flex-1">
                  <label className="text-red-400 text-xs mb-1 block">{t('nutrition.fatsG')}</label>
                  <input type="number" value={profFatsGoal} onChange={e => setProfFatsGoal(e.target.value)} placeholder="70"
                    className="bg-gray-800 text-white rounded-xl px-3 py-3 outline-none focus:ring-2 focus:ring-red-500 w-full text-sm" />
                </div>
              </div>
            </div>
            {profAge && profile?.height_cm && profile?.weight_goal_kg && (
              <div className="bg-indigo-950 rounded-xl p-3">
                <p className="text-indigo-300 text-sm">
                  {t('nutrition.estimatedNeedFmt', { energy: fmtEnergy(calculateTDEE({
                    height_cm: profile.height_cm,
                    weight_goal_kg: profile.weight_goal_kg,
                    age: parseInt(profAge),
                    gender: profGender,
                    activity_level: profActivity,
                    current_weight: currentWeight,
                  })) })}
                </p>
              </div>
            )}
            <button onClick={handleSaveProfile}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-colors">
              {t('common.save')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}