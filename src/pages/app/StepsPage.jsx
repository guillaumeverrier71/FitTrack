import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Footprints, Flame, Target, Pencil } from 'lucide-react'

const CALORIES_PER_STEP = 0.04

function getWeekDates() {
  const dates = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dates.push(d.toISOString().split('T')[0])
  }
  return dates
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('fr-FR', { weekday: 'short' })
}

function isToday(dateStr) {
  return dateStr === new Date().toISOString().split('T')[0]
}

export default function StepsPage() {
  const [weekData, setWeekData] = useState([])
  const [today, setToday] = useState(null)
  const [editing, setEditing] = useState(false)
  const [inputSteps, setInputSteps] = useState('')
  const [inputGoal, setInputGoal] = useState('')
  const [loading, setLoading] = useState(true)

  const todayDate = new Date().toISOString().split('T')[0]

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const dates = getWeekDates()

    const { data } = await supabase
      .from('daily_steps')
      .select('*')
      .eq('user_id', user.id)
      .in('date', dates)

    const mapped = dates.map(date => {
      const entry = data?.find(d => d.date === date)
      return {
        date,
        label: formatDate(date),
        steps: entry?.steps || 0,
        goal: entry?.goal || 10000,
        isToday: isToday(date),
      }
    })

    setWeekData(mapped)
    const todayEntry = mapped.find(d => d.isToday)
    setToday(todayEntry)
    setInputSteps(todayEntry?.steps?.toString() || '0')
    setInputGoal(todayEntry?.goal?.toString() || '10000')
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const steps = parseInt(inputSteps) || 0
    const goal = parseInt(inputGoal) || 10000

    await supabase.from('daily_steps').upsert({
      user_id: user.id,
      date: todayDate,
      steps,
      goal,
    }, { onConflict: 'user_id,date' })

    setEditing(false)
    fetchData()
  }

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-gray-950">
      <p className="text-white">Chargement...</p>
    </div>
  )

  const progress = today ? Math.min((today.steps / today.goal) * 100, 100) : 0
  const calories = today ? Math.round(today.steps * CALORIES_PER_STEP) : 0

  return (
    <div className="p-4 pb-24 bg-gray-950 min-h-screen">
      <h1 className="text-2xl font-bold text-white mb-6">Pas quotidiens</h1>

      {/* Card aujourd'hui */}
      <div className="bg-gray-900 rounded-2xl p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Footprints size={20} className="text-indigo-400" />
            <span className="text-gray-400 text-sm">Aujourd'hui</span>
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
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Nombre de pas</label>
              <input
                type="number"
                value={inputSteps}
                onChange={e => setInputSteps(e.target.value)}
                className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 w-full text-lg"
                placeholder="ex: 8500"
                autoFocus
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Objectif journalier</label>
              <input
                type="number"
                value={inputGoal}
                onChange={e => setInputGoal(e.target.value)}
                className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 w-full"
                placeholder="ex: 10000"
              />
            </div>
            <button
              onClick={handleSave}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Enregistrer
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-end gap-2 mb-4">
              <span className="text-5xl font-bold text-white">
                {today?.steps?.toLocaleString('fr-FR') || '0'}
              </span>
              <span className="text-gray-400 mb-1">/ {today?.goal?.toLocaleString('fr-FR')} pas</span>
            </div>

            {/* Barre de progression */}
            <div className="w-full bg-gray-800 rounded-full h-3 mb-4">
              <div
                className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-800 rounded-xl p-3 flex items-center gap-3">
                <Flame size={18} className="text-orange-400" />
                <div>
                  <p className="text-white font-semibold">{calories} kcal</p>
                  <p className="text-gray-500 text-xs">Estimées</p>
                </div>
              </div>
              <div className="bg-gray-800 rounded-xl p-3 flex items-center gap-3">
                <Target size={18} className="text-green-400" />
                <div>
                  <p className="text-white font-semibold">{Math.round(progress)}%</p>
                  <p className="text-gray-500 text-xs">Objectif</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Graphique semaine */}
      <div className="bg-gray-900 rounded-2xl p-5">
        <h2 className="text-white font-semibold mb-4">Cette semaine</h2>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={weekData} barSize={28}>
            <XAxis
              dataKey="label"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '12px' }}
              labelStyle={{ color: '#fff' }}
              formatter={(value) => [`${value.toLocaleString('fr-FR')} pas`, '']}
            />
            <Bar dataKey="steps" radius={[6, 6, 0, 0]}>
              {weekData.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.isToday ? '#6366f1' : entry.steps >= entry.goal ? '#22c55e' : '#374151'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-2 justify-center">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-indigo-500" />
            <span className="text-gray-400 text-xs">Aujourd'hui</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-gray-400 text-xs">Objectif atteint</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-gray-700" />
            <span className="text-gray-400 text-xs">Incomplet</span>
          </div>
        </div>
      </div>
    </div>
  )
}