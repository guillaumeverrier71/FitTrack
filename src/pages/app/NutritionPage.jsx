import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, Trash2, Flame, Target, X } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import FoodSearch from '../../components/nutrition/FoodSearch'

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
  const [meals, setMeals] = useState([])
  const [activities, setActivities] = useState([])
  const [profile, setProfile] = useState(null)
  const [currentWeight, setCurrentWeight] = useState(null)
  const [weekData, setWeekData] = useState([])
  const [showMealForm, setShowMealForm] = useState(false)
  const [showActivityForm, setShowActivityForm] = useState(false)
  const [showProfileForm, setShowProfileForm] = useState(false)
  const [mealCat, setMealCat] = useState('déjeuner')
  const [loading, setLoading] = useState(true)

  // Activity form
  const [actName, setActName] = useState('')
  const [actCals, setActCals] = useState('')
  const [actDuration, setActDuration] = useState('')

  // Profile form
  const [profAge, setProfAge] = useState('')
  const [profGender, setProfGender] = useState('homme')
  const [profActivity, setProfActivity] = useState('modere')
  const [profGoalCals, setProfGoalCals] = useState('')

  const fetchData = async () => {
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

    // Semaine
    const dates = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      dates.push(d.toISOString().split('T')[0])
    }

    const { data: weekMeals } = await supabase
      .from('meal_entries').select('date, calories').eq('user_id', user.id).in('date', dates)

    const { data: weekActs } = await supabase
      .from('activity_entries').select('date, calories_burned').eq('user_id', user.id).in('date', dates)

    const mapped = dates.map(date => {
      const ingested = (weekMeals || []).filter(m => m.date === date).reduce((s, m) => s + m.calories, 0)
      const burned = (weekActs || []).filter(a => a.date === date).reduce((s, a) => s + a.calories_burned, 0)
      return { date, label: formatDate(date), ingested, burned, net: ingested - burned, isToday: date === today }
    })

    setWeekData(mapped)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleAddMeal = async (foodData) => {
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
    fetchData()
  }

  const handleAddActivity = async () => {
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
    fetchData()
  }

  const handleSaveProfile = async () => {
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
    }, { onConflict: 'user_id' })

    setShowProfileForm(false)
    fetchData()
  }

  const handleDeleteMeal = async (id) => {
    await supabase.from('meal_entries').delete().eq('id', id)
    fetchData()
  }

  const handleDeleteActivity = async (id) => {
    await supabase.from('activity_entries').delete().eq('id', id)
    fetchData()
  }

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-gray-950">
      <p className="text-white">Chargement...</p>
    </div>
  )

  const totalIngested = meals.reduce((s, m) => s + m.calories, 0)
  const totalProteins = meals.reduce((s, m) => s + (m.proteins || 0), 0)
  const totalCarbs = meals.reduce((s, m) => s + (m.carbs || 0), 0)
  const totalFats = meals.reduce((s, m) => s + (m.fats || 0), 0)
  const totalBurned = activities.reduce((s, a) => s + a.calories_burned, 0)
  const netCalories = totalIngested - totalBurned

  const tdee = calculateTDEE({ ...profile, current_weight: currentWeight })
  const calorieGoal = profile?.calorie_goal || tdee

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
          className="text-xs bg-gray-800 text-gray-400 px-3 py-2 rounded-xl hover:text-white transition-colors"
        >
          ⚙️ Objectif
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
            <p className={`text-2xl font-bold ${netCalories > (calorieGoal || 9999) ? 'text-red-400' : 'text-white'}`}>
              {netCalories}
            </p>
            <p className="text-gray-500 text-xs mt-1">Net</p>
          </div>
        </div>

        {calorieGoal && (
          <>
            <div className="w-full bg-gray-800 rounded-full h-2 mb-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  netCalories > calorieGoal ? 'bg-red-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min((netCalories / calorieGoal) * 100, 100)}%` }}
              />
            </div>
            <p className="text-gray-500 text-xs mb-3">
              Objectif : {calorieGoal} kcal/jour
              {tdee && !profile?.calorie_goal && ' (calculé automatiquement)'}
            </p>
          </>
        )}

        {/* Macros */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-800 rounded-xl p-2 text-center">
            <p className="text-blue-400 font-bold text-sm">{Math.round(totalProteins)}g</p>
            <p className="text-gray-500 text-xs">Protéines</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-2 text-center">
            <p className="text-yellow-400 font-bold text-sm">{Math.round(totalCarbs)}g</p>
            <p className="text-gray-500 text-xs">Glucides</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-2 text-center">
            <p className="text-red-400 font-bold text-sm">{Math.round(totalFats)}g</p>
            <p className="text-gray-500 text-xs">Lipides</p>
          </div>
        </div>

        {!calorieGoal && (
          <button onClick={() => setShowProfileForm(true)} className="text-indigo-400 text-sm mt-3">
            → Configurer mon objectif calorique
          </button>
        )}
      </div>

      {/* Repas par catégorie */}
      <div className="bg-gray-900 rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold">Repas</h2>
          <div className="flex gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => { setMealCat(cat); setShowMealForm(true) }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white p-1.5 rounded-lg transition-colors"
                title={cat}
              >
                <Plus size={18} />
              </button>
            )).slice(0, 1)}
            <button
              onClick={() => setShowMealForm(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white p-1.5 rounded-lg transition-colors"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        {byCategory.map(({ cat, total, items }) => (
          <div key={cat}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm capitalize">{cat}</span>
              {total > 0 && <span className="text-gray-400 text-sm">{total} kcal</span>}
            </div>
            {items.length > 0 ? (
              <div className="flex flex-col gap-2">
                {items.map(meal => (
                  <div key={meal.id} className="flex flex-col bg-gray-800 rounded-xl px-3 py-2 gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-white text-sm">{meal.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-orange-400 text-sm font-medium">{meal.calories} kcal</span>
                        <button onClick={() => handleDeleteMeal(meal.id)} className="text-gray-500 hover:text-red-400 transition-colors">
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
                  {act.duration_minutes && (
                    <span className="text-gray-500 text-xs ml-2">{act.duration_minutes} min</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-green-400 text-sm font-medium">-{act.calories_burned} kcal</span>
                  <button onClick={() => handleDeleteActivity(act.id)} className="text-gray-500 hover:text-red-400 transition-colors">
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
              formatter={(value, name) => [`${value} kcal`, name === 'ingested' ? 'Ingérées' : 'Dépensées']}
            />
            <Bar dataKey="ingested" radius={[6, 6, 0, 0]}>
              {weekData.map((entry, i) => (
                <Cell key={i} fill={entry.isToday ? '#6366f1' : '#374151'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Modal FoodSearch */}
      {showMealForm && (
        <FoodSearch
          category={mealCat}
          onAdd={handleAddMeal}
          onClose={() => setShowMealForm(false)}
        />
      )}

      {/* Modal activité */}
      {showActivityForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end">
          <div className="bg-gray-900 w-full rounded-t-3xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold">Ajouter une activité</h2>
              <button onClick={() => setShowActivityForm(false)}><X size={22} className="text-gray-400" /></button>
            </div>
            <input type="text" placeholder="Activité (ex: Course à pied)" value={actName}
              onChange={e => setActName(e.target.value)}
              className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500" autoFocus />
            <input type="number" placeholder="Calories brûlées (kcal)" value={actCals}
              onChange={e => setActCals(e.target.value)}
              className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500" />
            <input type="number" placeholder="Durée (minutes, optionnel)" value={actDuration}
              onChange={e => setActDuration(e.target.value)}
              className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500" />
            <button onClick={handleAddActivity} disabled={!actName || !actCals}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors">
              Ajouter
            </button>
          </div>
        </div>
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
              <label className="text-gray-400 text-xs mb-1 block">Objectif manuel (optionnel)</label>
              <input type="number" value={profGoalCals} onChange={e => setProfGoalCals(e.target.value)} placeholder="ex: 2200"
                className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 w-full" />
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