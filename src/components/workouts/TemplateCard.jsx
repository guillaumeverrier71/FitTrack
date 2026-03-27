import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp } from 'lucide-react'

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export default function ProgressTab() {
  const [exercises, setExercises] = useState([])
  const [selected, setSelected] = useState(null)
  const [chartData, setChartData] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingChart, setLoadingChart] = useState(false)

  useEffect(() => {
    const fetchExercises = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      // Récupère tous les exercices loggés par cet utilisateur
      const { data: sessions } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('user_id', user.id)
        .not('finished_at', 'is', null)

      if (!sessions?.length) { setLoading(false); return }

      const sessionIds = sessions.map(s => s.id)

      const { data: sets } = await supabase
        .from('session_sets')
        .select('exercise_id, exercises(name)')
        .in('session_id', sessionIds)

      if (sets) {
        const unique = []
        const seen = new Set()
        sets.forEach(s => {
          if (!seen.has(s.exercise_id)) {
            seen.add(s.exercise_id)
            unique.push({ id: s.exercise_id, name: s.exercises?.name })
          }
        })
        const sorted = unique.filter(e => e.name).sort((a, b) => a.name.localeCompare(b.name))
        setExercises(sorted)
        if (sorted.length > 0) setSelected(sorted[0])
      }
      setLoading(false)
    }
    fetchExercises()
  }, [])

  useEffect(() => {
    if (!selected) return
    const fetchProgress = async () => {
      setLoadingChart(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoadingChart(false); return }

      const { data: sessions } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('user_id', user.id)
        .not('finished_at', 'is', null)

      if (!sessions?.length) { setLoadingChart(false); return }

      const sessionIds = sessions.map(s => s.id)

      const { data: sets } = await supabase
        .from('session_sets')
        .select('weight_kg, reps, logged_at')
        .eq('exercise_id', selected.id)
        .in('session_id', sessionIds)
        .order('logged_at', { ascending: true })

      if (sets && sets.length > 0) {
        const byDate = {}
        sets.forEach(s => {
          const date = s.logged_at.split('T')[0]
          const weight = parseFloat(s.weight_kg)
          const oneRM = Math.round(weight * (1 + s.reps / 30))
          if (!byDate[date] || weight > byDate[date].weight) {
            byDate[date] = { date, weight, reps: s.reps, oneRM }
          }
        })

        const data = Object.values(byDate).map(d => ({
          date: formatDate(d.date),
          poids: d.weight,
          '1RM': d.oneRM,
        }))

        setChartData(data)

        const weights = Object.values(byDate).map(d => d.weight)
        const first = weights[0]
        const last = weights[weights.length - 1]
        const max = Math.max(...weights)
        const progression = first > 0 ? (((last - first) / first) * 100).toFixed(1) : 0

        setStats({ first, last, max, progression, sessions: data.length })
      } else {
        setChartData([])
        setStats(null)
      }
      setLoadingChart(false)
    }
    fetchProgress()
  }, [selected])

  if (loading) return <p className="text-gray-400 px-4">Chargement...</p>

  if (exercises.length === 0) return (
    <div className="flex flex-col items-center justify-center mt-20 px-4 gap-3">
      <TrendingUp size={40} className="text-gray-700" />
      <p className="text-gray-400 text-center">Aucune donnée pour l'instant.</p>
      <p className="text-gray-500 text-sm text-center">Effectue des séances pour voir ta progression ici.</p>
    </div>
  )

  return (
    <div className="px-4 flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-gray-400 text-sm">Sélectionne un exercice</p>
        <div className="flex flex-wrap gap-2">
          {exercises.map(ex => (
            <button
              key={ex.id}
              onClick={() => setSelected(ex)}
              className={`text-sm px-3 py-2 rounded-xl transition-colors ${
                selected?.id === ex.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-900 text-gray-400'
              }`}
            >
              {ex.name}
            </button>
          ))}
        </div>
      </div>

      {loadingChart ? (
        <p className="text-gray-400 text-sm">Chargement...</p>
      ) : chartData.length < 2 ? (
        <div className="bg-gray-900 rounded-2xl p-5">
          <p className="text-gray-500 text-sm text-center py-4">
            Effectue au moins 2 séances avec cet exercice pour voir la progression
          </p>
        </div>
      ) : (
        <>
          {stats && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-900 rounded-2xl p-3 text-center">
                <p className="text-white font-bold">{stats.max} kg</p>
                <p className="text-gray-500 text-xs mt-1">Record</p>
              </div>
              <div className="bg-gray-900 rounded-2xl p-3 text-center">
                <p className={`font-bold ${parseFloat(stats.progression) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {parseFloat(stats.progression) > 0 ? '+' : ''}{stats.progression}%
                </p>
                <p className="text-gray-500 text-xs mt-1">Progression</p>
              </div>
              <div className="bg-gray-900 rounded-2xl p-3 text-center">
                <p className="text-white font-bold">{stats.sessions}</p>
                <p className="text-gray-500 text-xs mt-1">Séances</p>
              </div>
            </div>
          )}

          <div className="bg-gray-900 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4">Poids soulevé (kg)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} width={35} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '12px' }}
                  labelStyle={{ color: '#9ca3af' }}
                  formatter={(value) => [`${value} kg`, 'Poids']}
                />
                <Line type="monotone" dataKey="poids" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 3 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gray-900 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-1">1RM estimé (kg)</h3>
            <p className="text-gray-500 text-xs mb-4">Calculé via la formule d'Epley</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} width={35} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '12px' }}
                  labelStyle={{ color: '#9ca3af' }}
                  formatter={(value) => [`${value} kg`, '1RM estimé']}
                />
                <Line type="monotone" dataKey="1RM" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: '#f59e0b', r: 3 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}