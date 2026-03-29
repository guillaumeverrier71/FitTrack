import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Scale, Target, Pencil, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import { handleSupabaseError } from '../../lib/handleError'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { offlineQueue } from '../../lib/offlineQueue'
import { useLang } from '../../context/LangContext'
import { useUnits } from '../../context/UnitContext'

function getToday() {
  return new Date().toISOString().split('T')[0]
}

function calculateBMI(weightKg, heightCm) {
  if (!weightKg || !heightCm) return null
  const heightM = heightCm / 100
  return (weightKg / (heightM * heightM)).toFixed(1)
}

function getBMICategory(bmi, t) {
  if (!bmi) return null
  if (bmi < 18.5) return { label: t('weight.bmiUnderweight'), color: 'text-blue-400' }
  if (bmi < 25) return { label: t('weight.bmiNormal'), color: 'text-green-400' }
  if (bmi < 30) return { label: t('weight.bmiOverweight'), color: 'text-orange-400' }
  return { label: t('weight.bmiObese'), color: 'text-red-400' }
}

export default function WeightPage() {
  const toast = useToast()
  const isOnline = useOnlineStatus()
  const { t, lang } = useLang()
  const locale = lang === 'fr' ? 'fr-FR' : 'en-US'
  const { fmtWeight, fmtHeight, toWeightDisplay, fromWeightInput, weightLabel } = useUnits()

  const [entries, setEntries] = useState([])
  const [profile, setProfile] = useState(null)
  const [period, setPeriod] = useState(30)
  const [editing, setEditing] = useState(false)
  const [editingProfile, setEditingProfile] = useState(false)
  const [inputWeight, setInputWeight] = useState('')
  const [inputHeight, setInputHeight] = useState('')
  const [inputGoal, setInputGoal] = useState('')
  const [inputGender, setInputGender] = useState('')
  const [loading, setLoading] = useState(true)

  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
  }

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const since = new Date()
      since.setDate(since.getDate() - period)
      const sinceStr = since.toISOString().split('T')[0]

      const { data: weightData } = await supabase
        .from('weight_entries')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', sinceStr)
        .order('date', { ascending: true })

      const { data: profileData } = await supabase
        .from('user_profile')
        .select('*')
        .eq('user_id', user.id)
        .single()

      setEntries(weightData || [])
      setProfile(profileData)

      const todayEntry = weightData?.find(e => e.date === getToday())
      setInputWeight(todayEntry ? toWeightDisplay(todayEntry.weight_kg) : '')
      setInputHeight(profileData?.height_cm?.toString() || '')
      setInputGoal(profileData?.weight_goal_kg ? toWeightDisplay(profileData.weight_goal_kg) : '')
      setInputGender(profileData?.gender || '')
      setLoading(false)
    } catch (err) {
      await handleSupabaseError(err, toast, t('weight.errorLoad'))
    }
  }

  useEffect(() => { fetchData() }, [period])

  useEffect(() => {
    const handler = () => fetchData()
    window.addEventListener('bp-sync-complete', handler)
    return () => window.removeEventListener('bp-sync-complete', handler)
  }, [])

  const handleSaveWeight = async () => {
    try {
      if (!isOnline) {
        const { data: { user } } = await supabase.auth.getUser()
        const today = getToday()
        const weightKg = fromWeightInput(inputWeight)
        offlineQueue.add('upsert', 'weight_entries', {
          user_id: user.id,
          date: today,
          weight_kg: weightKg,
        }, { upsertOptions: { onConflict: 'user_id,date' } })
        setEntries(prev => {
          const filtered = prev.filter(e => e.date !== today)
          return [...filtered, { date: today, weight_kg: weightKg }].sort((a, b) => a.date.localeCompare(b.date))
        })
        setEditing(false)
        toast.info(t('weight.savedOffline'))
        return
      }
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('weight_entries').upsert({
        user_id: user.id,
        date: getToday(),
        weight_kg: fromWeightInput(inputWeight),
      }, { onConflict: 'user_id,date' })
      setEditing(false)
      toast.success(t('weight.savedSuccess'))
      fetchData()
    } catch (err) {
      await handleSupabaseError(err, toast, t('weight.errorSave'))
    }
  }

  const handleSaveProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('user_profile').upsert({
        user_id: user.id,
        height_cm: parseFloat(inputHeight) || null,
        weight_goal_kg: fromWeightInput(inputGoal) || null,
        gender: inputGender || null,
      }, { onConflict: 'user_id' })
      setEditingProfile(false)
      toast.success(t('weight.goalUpdated'))
      fetchData()
    } catch (err) {
      await handleSupabaseError(err, toast, t('weight.errorProfile'))
    }
  }

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-gray-950">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const latestWeight = entries.length > 0 ? entries[entries.length - 1]?.weight_kg : null
  const weekAgoEntry = entries.find(e => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return e.date === d.toISOString().split('T')[0]
  })
  const weekDiff = latestWeight && weekAgoEntry
    ? (latestWeight - weekAgoEntry.weight_kg).toFixed(1)
    : null

  const bmi = calculateBMI(latestWeight, profile?.height_cm)
  const bmiCategory = getBMICategory(bmi, t)

  const toDisplay = (kg) => parseFloat(toWeightDisplay(kg))
  const chartData = entries.map(e => ({
    date: formatDate(e.date),
    poids: toDisplay(e.weight_kg),
  }))

  const goalWeight = profile?.weight_goal_kg ? toDisplay(profile.weight_goal_kg) : null
  const allWeights = entries.map(e => toDisplay(e.weight_kg))
  if (goalWeight) allWeights.push(goalWeight)
  const minWeight = allWeights.length > 0 ? Math.min(...allWeights) - 2 : 50
  const maxWeight = allWeights.length > 0 ? Math.max(...allWeights) + 2 : 100

  return (
    <div className="p-4 pb-24 bg-gray-950 min-h-screen flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-white">{t('weight.title')}</h1>

      {/* Card poids aujourd'hui */}
      <div className="bg-gray-900 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Scale size={18} className="text-indigo-400" />
            <span className="text-gray-400 text-sm">{t('weight.today')}</span>
          </div>
          <button
            onClick={() => setEditing(!editing)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <Pencil size={18} />
          </button>
        </div>

        {editing ? (
          <div className="flex flex-col gap-3">
            <input
              type="number"
              step="0.1"
              value={inputWeight}
              onChange={e => setInputWeight(e.target.value)}
              placeholder={`ex: ${weightLabel === 'lbs' ? '165' : '75.5'} ${weightLabel}`}
              className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 w-full text-lg"
              autoFocus
            />
            <button
              onClick={handleSaveWeight}
              disabled={!inputWeight}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {t('weight.saveBtn')}
            </button>
          </div>
        ) : (
          <div className="flex items-end gap-4">
            <div>
              <span className="text-5xl font-bold text-white">
                {latestWeight ? toWeightDisplay(latestWeight) : '—'}
              </span>
              <span className="text-gray-400 text-xl ml-1">{weightLabel}</span>
            </div>
            {weekDiff !== null && (
              <div className={`flex items-center gap-1 mb-1 ${
                parseFloat(weekDiff) < 0 ? 'text-green-400' :
                parseFloat(weekDiff) > 0 ? 'text-red-400' : 'text-gray-400'
              }`}>
                {parseFloat(weekDiff) < 0 ? <TrendingDown size={16} /> :
                 parseFloat(weekDiff) > 0 ? <TrendingUp size={16} /> :
                 <Minus size={16} />}
                <span className="text-sm font-medium">
                  {parseFloat(weekDiff) > 0 ? '+' : ''}{fmtWeight(Math.abs(parseFloat(weekDiff)))} {t('weight.thisWeek')}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 gap-3">
        {/* Objectif */}
        <div className="bg-gray-900 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target size={16} className="text-green-400" />
            <span className="text-gray-400 text-xs">{t('weight.goal')}</span>
          </div>
          {profile?.weight_goal_kg ? (
            <>
              <p className="text-white font-bold text-xl">{fmtWeight(profile.weight_goal_kg)}</p>
              {latestWeight && (
                <p className="text-gray-400 text-xs mt-1">
                  {fmtWeight(Math.abs(latestWeight - profile.weight_goal_kg))} {latestWeight > profile.weight_goal_kg ? t('weight.tolose') : t('weight.togain')}
                </p>
              )}
            </>
          ) : (
            <p className="text-gray-500 text-sm">{t('weight.goalNotSet')}</p>
          )}
        </div>

        {/* IMC */}
        <div className="bg-gray-900 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Scale size={16} className="text-blue-400" />
            <span className="text-gray-400 text-xs">{t('weight.bmi')}</span>
          </div>
          {bmi ? (
            <>
              <p className="text-white font-bold text-xl">{bmi}</p>
              <p className={`text-xs mt-1 ${bmiCategory?.color}`}>{bmiCategory?.label}</p>
            </>
          ) : (
            <p className="text-gray-500 text-xs">{t('weight.bmiHint')}</p>
          )}
        </div>
      </div>

      {/* Graphique */}
      <div className="bg-gray-900 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">{t('weight.evolution')}</h2>
          <div className="flex gap-2">
            {[30, 90].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                  period === p ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400'
                }`}
              >
                {p === 30 ? t('weight.period30') : t('weight.period90')}
              </button>
            ))}
          </div>
        </div>

        {chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <XAxis
                dataKey="date"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[minWeight, maxWeight]}
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={35}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '12px' }}
                labelStyle={{ color: '#9ca3af' }}
                formatter={(value) => [`${value} ${weightLabel}`, t('weight.chartLabel')]}
              />
              {profile?.weight_goal_kg && (
                <ReferenceLine
                  y={profile.weight_goal_kg}
                  stroke="#22c55e"
                  strokeDasharray="4 4"
                  label={{ value: t('weight.goal'), fill: '#22c55e', fontSize: 11 }}
                />
              )}
              <Line
                type="monotone"
                dataKey="poids"
                stroke="#6366f1"
                strokeWidth={2.5}
                dot={{ fill: '#6366f1', r: 3 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 text-sm text-center py-8">
            {t('weight.chartHint')}
          </p>
        )}
      </div>

      {/* Profil — taille et objectif */}
      <div className="bg-gray-900 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">{t('weight.myProfile')}</h2>
          <button
            onClick={() => setEditingProfile(!editingProfile)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <Pencil size={18} />
          </button>
        </div>

        {editingProfile ? (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">{t('weight.height')}</label>
                <input
                  type="number"
                  value={inputHeight}
                  onChange={e => setInputHeight(e.target.value)}
                  placeholder={t('weight.heightPlaceholder')}
                  className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 w-full"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">{t('weight.goal')} ({weightLabel})</label>
                <input
                  type="number"
                  step="0.5"
                  value={inputGoal}
                  onChange={e => setInputGoal(e.target.value)}
                  placeholder={`ex: ${weightLabel === 'lbs' ? '165' : '75'} ${weightLabel}`}
                  className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 w-full"
                />
              </div>
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">{t('weight.gender')}</label>
              <div className="flex gap-2">
                {['homme', 'femme'].map(g => (
                  <button
                    key={g}
                    onClick={() => setInputGender(g)}
                    className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${inputGender === g ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                  >
                    {g === 'homme' ? t('common.male') : t('common.female')}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleSaveProfile}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {t('weight.saveBtn')}
            </button>
          </div>
        ) : (
          <div className="flex gap-6">
            <div>
              <p className="text-gray-400 text-xs">{t('weight.height')}</p>
              <p className="text-white font-semibold">{profile?.height_cm ? fmtHeight(profile.height_cm) : '—'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">{t('weight.goal')}</p>
              <p className="text-white font-semibold">{profile?.weight_goal_kg ? fmtWeight(profile.weight_goal_kg) : '—'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">{t('weight.gender')}</p>
              <p className="text-white font-semibold">{profile?.gender === 'homme' ? t('common.male') : profile?.gender === 'femme' ? t('common.female') : '—'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
