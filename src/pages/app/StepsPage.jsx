import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Footprints, Flame, Target, Pencil, Check, X } from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import { handleSupabaseError } from '../../lib/handleError'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { offlineQueue } from '../../lib/offlineQueue'
import { useLang } from '../../context/LangContext'

const CALORIES_PER_STEP = 0.04

function getToday() {
  return new Date().toISOString().split('T')[0]
}

function isToday(dateStr) {
  return dateStr === getToday()
}

function getDates(period) {
  const days = period === 'week' ? 7 : period === 'weeks' ? 84 : 30
  const dates = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dates.push(d.toISOString().split('T')[0])
  }
  return dates
}

function getMondayOf(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1)
  return d.toISOString().split('T')[0]
}

function groupByWeeks(dates, data, goalDefault, formatLabelFn) {
  const weekMap = {}
  dates.forEach(date => {
    const monday = getMondayOf(date)
    if (!weekMap[monday]) weekMap[monday] = { dates: [], steps: [], goal: goalDefault }
    const entry = data?.find(d => d.date === date)
    if (entry) {
      weekMap[monday].steps.push(entry.steps)
      weekMap[monday].goal = entry.goal
    }
  })
  const today = getToday()
  const currentMonday = getMondayOf(today)
  return Object.entries(weekMap).map(([monday, { steps, goal }]) => ({
    date: monday,
    label: formatLabelFn(monday, 'weeks'),
    steps: steps.length ? Math.round(steps.reduce((a, b) => a + b, 0) / 7) : 0,
    daysLogged: steps.length,
    goal,
    isToday: monday === currentMonday,
  }))
}

function RoundedBar({ x, y, width, height, fill }) {
  if (!height || height <= 0) return null
  const r = Math.min(4, width / 2)
  return (
    <path
      d={`M${x + r},${y} h${width - 2 * r} a${r},${r} 0 0 1 ${r},${r} v${height - r} h${-width} v${-(height - r)} a${r},${r} 0 0 1 ${r},${-r}z`}
      fill={fill}
    />
  )
}

export default function StepsPage() {
  const toast = useToast()
  const isOnline = useOnlineStatus()
  const { t, lang } = useLang()
  const locale = lang === 'fr' ? 'fr-FR' : 'en-US'

  const formatLabel = (dateStr, period) => {
    const d = new Date(dateStr + 'T00:00:00')
    if (period === 'week') return d.toLocaleDateString(locale, { weekday: 'short' })
    if (period === 'weeks') return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
    const day = d.getDate()
    return day % 5 === 0 || day === 1 ? `${day}` : ''
  }

  const formatDayLabel = (dateStr) => {
    if (isToday(dateStr)) return t('steps.today')
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' })
  }

  const [period, setPeriod] = useState('week')
  const [chartData, setChartData] = useState([])
  const [today, setToday] = useState(null)
  const [editing, setEditing] = useState(false)
  const [inputSteps, setInputSteps] = useState('')
  const [inputGoal, setInputGoal] = useState('')
  const [loading, setLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(false)
  const [dailyList, setDailyList] = useState([])

  const [openDate, setOpenDate] = useState(null)
  const [editInputSteps, setEditInputSteps] = useState('')
  const [editInputGoal, setEditInputGoal] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const dates = getDates(period)

      const { data } = await supabase
        .from('daily_steps')
        .select('*')
        .eq('user_id', user.id)
        .in('date', dates)

      const mapped = period === 'weeks'
        ? groupByWeeks(dates, data, 10000, formatLabel)
        : dates.map(date => {
            const entry = data?.find(d => d.date === date)
            return {
              date,
              label: formatLabel(date, period),
              steps: entry?.steps || 0,
              goal: entry?.goal || 10000,
              isToday: isToday(date),
            }
          })

      setChartData(mapped)

      const listDates = getDates('month')
      const listData = period === 'month' ? data : (await supabase
        .from('daily_steps').select('*').eq('user_id', user.id).in('date', listDates)).data
      setDailyList(listDates.map(date => {
        const entry = listData?.find(d => d.date === date)
        return { date, steps: entry?.steps || 0, goal: entry?.goal || 10000, isToday: isToday(date) }
      }))

      const todayRaw = data?.find(d => d.date === getToday())
      const todayEntry = {
        date: getToday(),
        steps: todayRaw?.steps || 0,
        goal: todayRaw?.goal || 10000,
        isToday: true,
      }
      setToday(todayEntry)
      setInputSteps(todayEntry.steps.toString())
      setInputGoal(todayEntry.goal.toString())
      setLoading(false)
      setChartLoading(false)
    } catch (err) {
      await handleSupabaseError(err, toast, 'Erreur de chargement.')
    }
  }

  useEffect(() => {
    setChartLoading(true)
    fetchData()
  }, [period])

  useEffect(() => {
    const handler = () => fetchData()
    window.addEventListener('bp-sync-complete', handler)
    return () => window.removeEventListener('bp-sync-complete', handler)
  }, [])

  const handleSaveToday = async () => {
    try {
      if (!isOnline) {
        const { data: { user } } = await supabase.auth.getUser()
        offlineQueue.add('upsert', 'daily_steps', {
          user_id: user.id,
          date: getToday(),
          steps: parseInt(inputSteps) || 0,
          goal: parseInt(inputGoal) || 10000,
        }, { upsertOptions: { onConflict: 'user_id,date' } })
        setToday(prev => ({ ...prev, steps: parseInt(inputSteps) || 0, goal: parseInt(inputGoal) || 10000 }))
        setEditing(false)
        toast.info(t('steps.offlineSaved'))
        return
      }
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('daily_steps').upsert({
        user_id: user.id,
        date: getToday(),
        steps: parseInt(inputSteps) || 0,
        goal: parseInt(inputGoal) || 10000,
      }, { onConflict: 'user_id,date' })
      setEditing(false)
      toast.success(t('steps.updated'))
      fetchData()
    } catch (err) {
      await handleSupabaseError(err, toast, 'Erreur lors de l\'enregistrement des pas.')
    }
  }

  const openDay = (entry) => {
    setOpenDate(entry.date)
    setEditInputSteps(entry.steps.toString())
    setEditInputGoal(entry.goal.toString())
  }

  const handleSaveDay = async () => {
    setSaving(true)
    try {
      if (!isOnline) {
        const { data: { user } } = await supabase.auth.getUser()
        offlineQueue.add('upsert', 'daily_steps', {
          user_id: user.id,
          date: openDate,
          steps: parseInt(editInputSteps) || 0,
          goal: parseInt(editInputGoal) || 10000,
        }, { upsertOptions: { onConflict: 'user_id,date' } })
        setDailyList(prev => prev.map(e => e.date === openDate ? { ...e, steps: parseInt(editInputSteps) || 0, goal: parseInt(editInputGoal) || 10000 } : e))
        setSaving(false)
        setOpenDate(null)
        toast.info(t('steps.offlineSaved'))
        return
      }
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('daily_steps').upsert({
        user_id: user.id,
        date: openDate,
        steps: parseInt(editInputSteps) || 0,
        goal: parseInt(editInputGoal) || 10000,
      }, { onConflict: 'user_id,date' })
      setSaving(false)
      setOpenDate(null)
      toast.success(t('steps.updated'))
      fetchData()
    } catch (err) {
      setSaving(false)
      await handleSupabaseError(err, toast, 'Erreur lors de l\'enregistrement des pas.')
    }
  }

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-gray-950">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const progress = today ? Math.min((today.steps / today.goal) * 100, 100) : 0
  const calories = today ? Math.round(today.steps * CALORIES_PER_STEP) : 0
  const goalLine = today?.goal || 10000

  const avgSteps = period === 'month'
    ? Math.round(chartData.filter(d => d.steps > 0).reduce((s, d) => s + d.steps, 0) / (chartData.filter(d => d.steps > 0).length || 1))
    : null
  const daysGoalReached = period === 'month'
    ? chartData.filter(d => d.steps >= d.goal).length
    : null

  return (
    <div className="p-4 pb-24 bg-gray-950 min-h-screen flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-white">{t('steps.title')}</h1>

      {/* Card aujourd'hui */}
      <div className="bg-gray-900 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Footprints size={20} className="text-indigo-400" />
            <span className="text-gray-400 text-sm">{t('steps.today')}</span>
          </div>
          <button onClick={() => setEditing(!editing)} className="text-gray-400 hover:text-white transition-colors">
            <Pencil size={18} />
          </button>
        </div>

        {editing ? (
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">{t('steps.stepCount')}</label>
              <input
                type="number"
                value={inputSteps}
                onChange={e => setInputSteps(e.target.value)}
                className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 w-full text-lg"
                placeholder={t('steps.stepCountPlaceholder')}
                autoFocus
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">{t('steps.dailyGoal')}</label>
              <input
                type="number"
                value={inputGoal}
                onChange={e => setInputGoal(e.target.value)}
                className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 w-full"
                placeholder={t('steps.goalPlaceholder')}
              />
            </div>
            <button
              onClick={handleSaveToday}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {t('common.save')}
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-end gap-2 mb-4">
              <span className="text-5xl font-bold text-white">
                {today?.steps?.toLocaleString(locale) || '0'}
              </span>
              <span className="text-gray-400 mb-1">/ {today?.goal?.toLocaleString(locale)} {t('steps.stepsLabel').toLowerCase()}</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-3 mb-4">
              <div
                className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-800 rounded-xl p-3 flex items-center gap-3">
                <Flame size={18} className="text-orange-400" />
                <div>
                  <p className="text-white font-semibold">{calories} kcal</p>
                  <p className="text-gray-500 text-xs">{t('steps.estimated')}</p>
                </div>
              </div>
              <div className="bg-gray-800 rounded-xl p-3 flex items-center gap-3">
                <Target size={18} className="text-green-400" />
                <div>
                  <p className="text-white font-semibold">{Math.round(progress)}%</p>
                  <p className="text-gray-500 text-xs">{t('steps.goalPct')}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Graphique */}
      <div className="bg-gray-900 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">
            {period === 'week' ? t('steps.thisWeek') : period === 'month' ? t('steps.thisMonth') : t('steps.last12Weeks')}
          </h2>
          <div className="flex gap-1.5 bg-gray-800 p-1 rounded-xl">
            {[{ key: 'week', label: '7j' }, { key: 'month', label: '30j' }, { key: 'weeks', label: lang === 'fr' ? 'Semaines' : 'Weeks' }].map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  period === p.key ? 'bg-indigo-600 text-white' : 'text-gray-400'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {chartLoading ? (
          <div className="h-[180px] flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : null}
        <ResponsiveContainer width="100%" height={chartLoading ? 0 : 180}>
          <BarChart data={chartData} barSize={period === 'week' ? 28 : period === 'weeks' ? 18 : 7}>
            <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '12px' }}
              labelStyle={{ color: '#9ca3af', fontSize: 11 }}
              formatter={(value) => {
                if (period === 'weeks') return [`${value.toLocaleString(locale)} ${t('steps.stepsLabel').toLowerCase()}/${lang === 'fr' ? 'j en moy.' : 'day avg.'}`, '']
                return [`${value.toLocaleString(locale)} ${t('steps.stepsLabel').toLowerCase()}`, '']
              }}
              labelFormatter={(_, payload) => {
                if (!payload?.[0]) return ''
                const entry = payload[0].payload
                const d = new Date(entry.date + 'T00:00:00')
                if (period === 'weeks') {
                  return `${lang === 'fr' ? 'Sem. du' : 'Week of'} ${d.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} · ${entry.daysLogged || 0}${lang === 'fr' ? 'j enregistrés' : ' days logged'}`
                }
                return d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' })
              }}
            />
            <ReferenceLine y={goalLine} stroke="#6366f1" strokeDasharray="4 4" strokeOpacity={0.4} />
            <Bar
              dataKey="steps"
              isAnimationActive={false}
              shape={(props) => {
                const entry = chartData[props.index]
                const fill = entry.isToday ? '#6366f1' : entry.steps >= entry.goal ? '#22c55e' : '#374151'
                return <RoundedBar {...props} fill={fill} />
              }}
            />
          </BarChart>
        </ResponsiveContainer>

        <div className="flex gap-4 mt-2 justify-center">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-indigo-500" />
            <span className="text-gray-400 text-xs">{period === 'weeks' ? t('steps.legendCurrent') : t('steps.legendToday')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-gray-400 text-xs">{t('steps.legendGoalReached')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-gray-700" />
            <span className="text-gray-400 text-xs">{t('steps.legendIncomplete')}</span>
          </div>
        </div>

        {period === 'month' && (
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-800">
            <div className="text-center">
              <p className="text-white font-bold text-lg">{avgSteps?.toLocaleString(locale)}</p>
              <p className="text-gray-500 text-xs">{t('steps.avgPerDay')}</p>
            </div>
            <div className="text-center">
              <p className="text-white font-bold text-lg">
                {daysGoalReached} <span className="text-gray-600 font-normal text-sm">/ 30{lang === 'fr' ? 'j' : 'd'}</span>
              </p>
              <p className="text-gray-500 text-xs">{t('steps.goalsReached')}</p>
            </div>
          </div>
        )}

        {period === 'weeks' && (() => {
          const weeksWithData = chartData.filter(w => w.daysLogged > 0)
          const bestWeek = weeksWithData.length ? Math.max(...weeksWithData.map(w => w.steps)) : 0
          const avgWeek = weeksWithData.length ? Math.round(weeksWithData.reduce((s, w) => s + w.steps, 0) / weeksWithData.length) : 0
          const weeksGoal = chartData.filter(w => w.steps >= w.goal).length
          return (
            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-800">
              <div className="text-center">
                <p className="text-white font-bold text-lg">{avgWeek.toLocaleString(locale)}</p>
                <p className="text-gray-500 text-xs">{t('steps.avgPerDayWeeks')}</p>
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-lg">{bestWeek.toLocaleString(locale)}</p>
                <p className="text-gray-500 text-xs">{t('steps.bestWeek')}</p>
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-lg">{weeksGoal}</p>
                <p className="text-gray-500 text-xs">{t('steps.goalsReachedWeeks')}</p>
              </div>
            </div>
          )
        })()}
      </div>

      {/* Liste des jours */}
      <div className="bg-gray-900 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-white font-semibold">{t('steps.detailByDay')}</h2>
        </div>
        <div className="flex flex-col divide-y divide-gray-800">
          {[...dailyList].reverse().map(entry => (
            <div key={entry.date}>
              <button
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-800/50 transition-colors"
                onClick={() => openDate === entry.date ? setOpenDate(null) : openDay(entry)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    entry.isToday ? 'bg-indigo-400'
                    : entry.steps >= entry.goal ? 'bg-green-400'
                    : entry.steps > 0 ? 'bg-gray-500'
                    : 'bg-gray-700'
                  }`} />
                  <span className={`text-sm capitalize ${entry.isToday ? 'text-white font-medium' : 'text-gray-400'}`}>
                    {formatDayLabel(entry.date)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-semibold ${
                    entry.steps >= entry.goal ? 'text-green-400'
                    : entry.steps > 0 ? 'text-white'
                    : 'text-gray-600'
                  }`}>
                    {entry.steps > 0 ? entry.steps.toLocaleString(locale) : '—'}
                  </span>
                  <Pencil size={13} className={`transition-colors ${openDate === entry.date ? 'text-indigo-400' : 'text-gray-600'}`} />
                </div>
              </button>

              {openDate === entry.date && (
                <div className="px-5 pb-4 flex flex-col gap-3 bg-gray-800/30">
                  <div className="grid grid-cols-2 gap-3 pt-3">
                    <div>
                      <label className="text-gray-500 text-xs mb-1 block">{t('steps.stepsLabel')}</label>
                      <input
                        type="number"
                        value={editInputSteps}
                        onChange={e => setEditInputSteps(e.target.value)}
                        className="bg-gray-800 text-white rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 w-full text-sm"
                        placeholder={t('steps.stepCountPlaceholder')}
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="text-gray-500 text-xs mb-1 block">{t('steps.goalPct')}</label>
                      <input
                        type="number"
                        value={editInputGoal}
                        onChange={e => setEditInputGoal(e.target.value)}
                        className="bg-gray-800 text-white rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 w-full text-sm"
                        placeholder={t('steps.goalPlaceholder')}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setOpenDate(null)}
                      className="flex items-center justify-center gap-1.5 flex-1 bg-gray-800 hover:bg-gray-700 text-gray-400 font-medium py-2.5 rounded-xl text-sm transition-colors"
                    >
                      <X size={14} /> {t('common.cancel')}
                    </button>
                    <button
                      onClick={handleSaveDay}
                      disabled={saving}
                      className="flex items-center justify-center gap-1.5 flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl text-sm transition-colors"
                    >
                      <Check size={14} /> {t('common.save')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
