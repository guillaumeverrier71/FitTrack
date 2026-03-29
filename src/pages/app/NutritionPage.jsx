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

const CATEGORIES = ['petit-déj', 'déjeuner', 'dîner', 'snack']
const ACTIVITY_LEVELS = {
  sedentaire: { label: 'Sédentaire', multiplier: 1.2 },
  leger: { label: 'Légèrement actif', multiplier: 1.375 },
  modere: { label: 'Modérément actif', multiplier: 1.55 },
  actif: { label: 'Très actif', multiplier: 1.725 },
  tres_actif: { label: 'Extrêmement actif', multiplier: 1.9 },
}

function getToday() {
  return new Date().toISOString().split('T')[0]
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('fr-FR', { weekday: 'short' })
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
  const [meals, setMeals] = useState([])
  const [activities, setActivities] = useState([])
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

      const [
        { data: mealsData },
        { data: activitiesData },
        { data: profileData },
        { data: weightData },
      ] = await Promise.all([
        supabase.from('meal_entries').select('*').eq('user_id', user.id).eq('date', today).order('created_at'),
        supabase.from('activity_entries').select('*').eq('user_id', user.id).eq('date', today).order('created_at'),
        supabase.from('user_profile').select('*').eq('user_id', user.id).single(),
        supabase.from('weight_entries').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(1),
      ])

      setMeals(mealsData || [])
      setActivities(activitiesData || [])
      setProfile(profileData)
      setCurrentWeight(weightData?.[0]?.weight_kg || null)
      setProfAge(profileData?.age?.toString() || '')
      setProfGender(profileData?.gender || 'homme')
      setProfActivity(profileData?.activity_level || 'modere')
      setProfGoalCals(profileData?.calorie_goal?.toString() || '')
      setProfProteinsGoal(profileData?.proteins_goal_g?.toString() || '')
      setProfCarbsGoal(profileData?.carbs_goal_g?.toString() || '')
      setProfFatsGoal(profileData?.fats_goal_g?.toString() || '')

      const dates = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        dates.push(d.toISOString().split('T')[0])
      }

      const { data: weekMeals } = await supabase.from('meal_entries').select('date, calories').eq('user_id', user.id).in('date', dates)
      const { data: weekActs } = await supabase.from('activity_entries').select('date, calories_burned').eq('user_id', user.id).in('date', dates)

      const mapped = dates.map(date => ({
        date,
        label: formatDate(date),
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
        toast.info('Ajouté hors-ligne — sera synchronisé à la reconnexion.')
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
      toast.success('Aliment ajouté !')
      fetchData()
    } catch (err) {
      await handleSupabaseError(err, toast, 'Erreur lors de l\'ajout de l\'aliment.')
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
        toast.info('Activité ajoutée hors-ligne — sera synchronisée à la reconnexion.')
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
      toast.success('Activité ajoutée !')
      fetchData()
    } catch (err) {
      await handleSupabaseError(err, toast, 'Erreur lors de l\'ajout de l\'activité.')
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
      toast.success('Objectif mis à jour !')
      fetchData()
    } catch (err) {
      await handleSupabaseError(err, toast, 'Erreur lors de la mise à jour de l\'objectif.')
    }
  }

  const handleAddManual = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('meal_entries').insert({
        user_id: user.id,
        date: getToday(),
        name: manName.trim() || 'Saisie manuelle',
        calories: parseInt(manCals) || 0,
        proteins: parseFloat(manProteins) || 0,
        carbs: parseFloat(manCarbs) || 0,
        fats: parseFloat(manFats) || 0,
        quantity_g: 100,
        category: manualCat,
      })
      setManName(''); setManCals(''); setManProteins(''); setManCarbs(''); setManFats('')
      setShowManualForm(false)
      toast.success('Ajouté !')
      fetchData()
    } catch (err) {
      await handleSupabaseError(err, toast, 'Erreur lors de l\'ajout.')
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
        toast.info('Aucun repas hier à copier.')
        return
      }
      await supabase.from('meal_entries').insert(
        yesterdayMeals.map(({ id, created_at, ...m }) => ({ ...m, date: getToday() }))
      )
      toast.success(`${yesterdayMeals.length} repas copiés depuis hier !`)
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
  const totalBurned = activities.reduce((s, a) => s + a.calories_burned, 0)
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

  const byCategory = CATEGORIES.map(cat => ({
    cat,
    total: meals.filter(m => m.category === cat).reduce((s, m) => s + m.calories, 0),
    items: meals.filter(m => m.category === cat),
  }))

  return (
    <div className="p-4 pb-24 bg-gray-950 min-h-screen flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Calories</h1>
        <button
          onClick={() => setShowProfileForm(true)}
          className="flex items-center gap-2 bg-gray-900 border border-gray-800 hover:border-indigo-500/50 text-gray-400 hover:text-white px-4 py-2.5 rounded-xl transition-all"
        >
          <Settings2 size={15} className="text-indigo-400 shrink-0" />
          <span className="text-sm font-medium">
            {calorieGoal ? `${calorieGoal} kcal` : 'Objectif'}
          </span>
        </button>
      </div>

      {/* Balance du jour */}
      <div className="bg-gray-900 rounded-2xl p-5">
        <p className="text-gray-400 text-sm mb-3">Balance du jour</p>
        <div className="flex items-center justify-between mb-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">{totalIngested}</p>
            <p className="text-gray-500 text-xs mt-1">Ingérées</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-400">{totalBurned}</p>
            <p className="text-gray-500 text-xs mt-1">Dépensées</p>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-bold ${calorieGoal && netCalories > calorieGoal ? 'text-red-400' : 'text-white'}`}>
              {netCalories}
            </p>
            <p className="text-gray-500 text-xs mt-1">Net</p>
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
            <p className="text-gray-500 text-xs mb-3">Objectif : {calorieGoal} kcal/jour</p>
          </>
        )}

        <div className="flex flex-col gap-2">
          {[
            { label: 'Protéines', value: totalProteins, goal: macroGoals?.proteins, color: 'bg-blue-500', text: 'text-blue-400' },
            { label: 'Glucides', value: totalCarbs, goal: macroGoals?.carbs, color: 'bg-yellow-500', text: 'text-yellow-400' },
            { label: 'Lipides', value: totalFats, goal: macroGoals?.fats, color: 'bg-red-500', text: 'text-red-400' },
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
          <h2 className="text-white font-semibold">Repas</h2>
          <button
            onClick={handleCopyYesterday}
            disabled={copyingYesterday}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <Copy size={13} />
            {copyingYesterday ? 'Copie...' : 'Copier hier'}
          </button>
        </div>
        {byCategory.map(({ cat, total, items }) => (
          <div key={cat}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm capitalize">{cat}</span>
              <div className="flex items-center gap-2">
                {total > 0 && <span className="text-gray-400 text-sm">{total} kcal</span>}
                <button
                  onClick={() => { setManualCat(cat); setShowManualForm(true) }}
                  className="bg-gray-700 hover:bg-gray-600 text-gray-300 p-1 rounded-lg transition-colors"
                  title="Saisie manuelle"
                >
                  <PenLine size={16} />
                </button>
                <button
                  onClick={() => { setActiveMealCat(cat); setShowMealForm(true) }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white p-1 rounded-lg transition-colors"
                  title="Rechercher un aliment"
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
                        <span className="text-orange-400 text-sm font-medium">{meal.calories} kcal</span>
                        <button onClick={() => setConfirmDelete({ id: meal.id, type: 'meal' })} className="text-gray-500 hover:text-red-400 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {(meal.proteins > 0 || meal.carbs > 0 || meal.fats > 0) && (
                      <div className="flex gap-3">
                        <span className="text-blue-400 text-xs">{meal.proteins}g prot</span>
                        <span className="text-yellow-400 text-xs">{meal.carbs}g gluc</span>
                        <span className="text-red-400 text-xs">{meal.fats}g lip</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-xs">Rien ajouté</p>
            )}
          </div>
        ))}
      </div>

      {/* Activités */}
      <div className="bg-gray-900 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">Activités</h2>
          <button
            onClick={() => setShowActivityForm(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white p-1.5 rounded-lg transition-colors"
          >
            <Plus size={18} />
          </button>
        </div>
        {activities.length === 0 ? (
          <p className="text-gray-500 text-sm">Aucune activité aujourd'hui</p>
        ) : (
          <div className="flex flex-col gap-2">
            {activities.map(act => (
              <div key={act.id} className="flex items-center justify-between bg-gray-800 rounded-xl px-3 py-2">
                <div>
                  <span className="text-white text-sm">{act.name}</span>
                  {act.duration_minutes && <span className="text-gray-500 text-xs ml-2">{act.duration_minutes} min</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-green-400 text-sm font-medium">-{act.calories_burned} kcal</span>
                  <button onClick={() => setConfirmDelete({ id: act.id, type: 'activity' })} className="text-gray-500 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Graphique semaine */}
      <div className="bg-gray-900 rounded-2xl p-5">
        <h2 className="text-white font-semibold mb-4">Cette semaine</h2>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={weekData} barSize={24}>
            <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '12px' }}
              formatter={(value) => [`${value} kcal`, 'Ingérées']}
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
                <h2 className="text-white font-semibold">Saisie manuelle</h2>
                <p className="text-gray-500 text-xs capitalize">{manualCat}</p>
              </div>
              <button onClick={() => setShowManualForm(false)}><X size={22} className="text-gray-400" /></button>
            </div>

            <input
              type="text"
              placeholder="Nom (ex: Riz blanc)"
              value={manName}
              onChange={e => setManName(e.target.value)}
              className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />

            <div>
              <label className="text-gray-400 text-xs mb-1 block">Calories (kcal) *</label>
              <input
                type="number"
                placeholder="ex: 350"
                value={manCals}
                onChange={e => setManCals(e.target.value)}
                className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 w-full"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-blue-400 text-xs mb-1 block">Protéines (g)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={manProteins}
                  onChange={e => setManProteins(e.target.value)}
                  className="bg-gray-800 text-white rounded-xl px-3 py-3 outline-none focus:ring-2 focus:ring-blue-500 w-full text-center"
                />
              </div>
              <div>
                <label className="text-yellow-400 text-xs mb-1 block">Glucides (g)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={manCarbs}
                  onChange={e => setManCarbs(e.target.value)}
                  className="bg-gray-800 text-white rounded-xl px-3 py-3 outline-none focus:ring-2 focus:ring-yellow-500 w-full text-center"
                />
              </div>
              <div>
                <label className="text-red-400 text-xs mb-1 block">Lipides (g)</label>
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
              Ajouter
            </button>
          </div>
        </div>
      )}

      {/* Modal activité */}
      {showActivityForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end">
          <div className="bg-gray-900 w-full rounded-t-3xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold">Ajouter une activité</h2>
              <button onClick={() => setShowActivityForm(false)}><X size={22} className="text-gray-400" /></button>
            </div>
            <input type="text" placeholder="Activité (ex: Course à pied)" value={actName} onChange={e => setActName(e.target.value)}
              className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500" autoFocus />
            <input type="number" placeholder="Calories brûlées (kcal)" value={actCals} onChange={e => setActCals(e.target.value)}
              className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500" />
            <input type="number" placeholder="Durée (minutes, optionnel)" value={actDuration} onChange={e => setActDuration(e.target.value)}
              className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500" />
            <button onClick={handleAddActivity} disabled={!actName || !actCals}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors">
              Ajouter
            </button>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal
          title={confirmDelete.type === 'meal' ? 'Supprimer ce repas ?' : 'Supprimer cette activité ?'}
          description="Cette action est irréversible."
          confirmLabel="Supprimer"
          onConfirm={confirmDeleteAndExecute}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* Modal objectif calorique */}
      {showProfileForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end">
          <div className="bg-gray-900 w-full rounded-t-3xl p-6 flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold">Objectif calorique</h2>
              <button onClick={() => setShowProfileForm(false)}><X size={22} className="text-gray-400" /></button>
            </div>
            <p className="text-gray-400 text-sm">Renseigne ces infos pour calculer automatiquement ton besoin calorique journalier.</p>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Âge</label>
              <input type="number" value={profAge} onChange={e => setProfAge(e.target.value)} placeholder="ex: 25"
                className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 w-full" />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Sexe</label>
              <div className="flex gap-2">
                {['homme', 'femme'].map(g => (
                  <button key={g} onClick={() => setProfGender(g)}
                    className={`flex-1 py-3 rounded-xl text-sm capitalize transition-colors ${profGender === g ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Niveau d'activité</label>
              <div className="flex flex-col gap-2">
                {Object.entries(ACTIVITY_LEVELS).map(([key, { label }]) => (
                  <button key={key} onClick={() => setProfActivity(key)}
                    className={`py-3 px-4 rounded-xl text-sm text-left transition-colors ${profActivity === key ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Objectif calorique manuel (optionnel)</label>
              <input type="number" value={profGoalCals} onChange={e => setProfGoalCals(e.target.value)} placeholder="ex: 2200"
                className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 w-full" />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-2 block">Objectifs macros (optionnel — sinon calculé depuis les calories)</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-blue-400 text-xs mb-1 block">Protéines (g)</label>
                  <input type="number" value={profProteinsGoal} onChange={e => setProfProteinsGoal(e.target.value)} placeholder="ex: 150"
                    className="bg-gray-800 text-white rounded-xl px-3 py-3 outline-none focus:ring-2 focus:ring-blue-500 w-full text-sm" />
                </div>
                <div className="flex-1">
                  <label className="text-yellow-400 text-xs mb-1 block">Glucides (g)</label>
                  <input type="number" value={profCarbsGoal} onChange={e => setProfCarbsGoal(e.target.value)} placeholder="ex: 250"
                    className="bg-gray-800 text-white rounded-xl px-3 py-3 outline-none focus:ring-2 focus:ring-yellow-500 w-full text-sm" />
                </div>
                <div className="flex-1">
                  <label className="text-red-400 text-xs mb-1 block">Lipides (g)</label>
                  <input type="number" value={profFatsGoal} onChange={e => setProfFatsGoal(e.target.value)} placeholder="ex: 70"
                    className="bg-gray-800 text-white rounded-xl px-3 py-3 outline-none focus:ring-2 focus:ring-red-500 w-full text-sm" />
                </div>
              </div>
            </div>
            {profAge && profile?.height_cm && profile?.weight_goal_kg && (
              <div className="bg-indigo-950 rounded-xl p-3">
                <p className="text-indigo-300 text-sm">
                  Besoin estimé : <span className="font-bold text-white">
                    {calculateTDEE({
                      height_cm: profile.height_cm,
                      weight_goal_kg: profile.weight_goal_kg,
                      age: parseInt(profAge),
                      gender: profGender,
                      activity_level: profActivity,
                      current_weight: currentWeight,
                    })} kcal/jour
                  </span>
                </p>
              </div>
            )}
            <button onClick={handleSaveProfile}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-colors">
              Enregistrer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}