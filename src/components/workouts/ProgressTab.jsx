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

  // 🔹 Récupération des exercices loggés
  useEffect(() => {
    const fetchExercises = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError) return

        const { data: sessions, error: sessionsError } = await supabase
          .from('workout_sessions')
          .select('id')
          .eq('user_id', user.id)

        if (sessionsError) return

        const sessionIds = sessions.map(s => s.id)
        if (sessionIds.length === 0) {
          setExercises([])
          setLoading(false)
          return
        }

        const { data: exerciseSets, error: setsError } = await supabase
          .from('session_sets')
          .select('exercise_id, exercises(name)')
          .in('session_id', sessionIds)

        if (setsError) return

        // Récupération unique des exercices
        const unique = []
        const seen = new Set()
        exerciseSets.forEach(s => {
          if (!seen.has(s.exercise_id)) {
            seen.add(s.exercise_id)
            unique.push({ id: s.exercise_id, name: s.exercises?.name })
          }
        })
        setExercises(unique.sort((a, b) => a.name.localeCompare(b.name)))
        if (unique.length > 0) setSelected(unique[0])
      } catch {
        // silently handled
      } finally {
        setLoading(false)
      }
    }
    fetchExercises()
  }, [])

  // 🔹 Récupération de la progression
  useEffect(() => {
    if (!selected) return

    const fetchProgress = async () => {
      try {
        setLoadingChart(true)
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError) throw userError

        // Récupérer les sets pour l'exercice sélectionné
        const { data: progressSets, error: progressError } = await supabase
          .from('session_sets')
          .select('session_id, weight_kg, reps, logged_at, workout_sessions!inner(user_id, finished_at)')
          .eq('exercise_id', selected.id)
          .eq('workout_sessions.user_id', user.id)
          .not('workout_sessions.finished_at', 'is', null)
          .order('logged_at', { ascending: true })

        if (progressError) throw progressError

        if (progressSets && progressSets.length > 0) {
          // Regrouper par session_id
          const bySession = {}
          progressSets.forEach(s => {
            const weight = parseFloat(s.weight_kg)
            if (!bySession[s.session_id]) {
              bySession[s.session_id] = { date: s.logged_at.split('T')[0], volume: 0, maxWeight: 0 }
            }
            bySession[s.session_id].volume += weight * s.reps
            if (weight > bySession[s.session_id].maxWeight) {
              bySession[s.session_id].maxWeight = weight
            }
          })

          const data = Object.entries(bySession).map(([sessionId, d]) => ({
            sessionId,
            date: formatDate(d.date),
            volume: Math.round(d.volume),
            poids: d.maxWeight,
          }))

          setChartData(data)

          // Stats
          const pr = Math.max(...data.map(d => d.poids))
          const lastPoids = data[data.length - 1].poids
          const prevPoids = data.length >= 2 ? data[data.length - 2].poids : null
          const vsLastSession = prevPoids !== null ? parseFloat((lastPoids - prevPoids).toFixed(1)) : null

          setStats({ pr, vsLastSession, sessions: data.length })
        } else {
          setChartData([])
          setStats(null)
        }
      } catch {
        // silently handled
      } finally {
        setLoadingChart(false)
      }
    }
    fetchProgress()
  }, [selected])

  // 🔹 Rendu
  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (exercises.length === 0)
    return (
      <div className="flex flex-col items-center justify-center mt-20 px-4 gap-3">
        <TrendingUp size={40} className="text-gray-700" />
        <p className="text-gray-400 text-center">Aucune donnée pour l'instant.</p>
        <p className="text-gray-500 text-sm text-center">Effectue des séances pour voir ta progression ici.</p>
      </div>
    )

  return (
    <div className="px-4 flex flex-col gap-4">
      {/* Sélecteur exercice */}
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

      {/* Affichage graphique ou message */}
      {loadingChart ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : chartData.length < 2 ? (
        <div className="bg-gray-900 rounded-2xl p-5">
          <p className="text-gray-500 text-sm text-center py-4">
            Effectue au moins 2 séances avec cet exercice pour voir la progression
          </p>
        </div>
      ) : (
        <>
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-900 rounded-2xl p-3 text-center">
                <p className="text-white font-bold">{stats.pr} kg</p>
                <p className="text-gray-500 text-xs mt-1">Record (PR)</p>
              </div>
              <div className="bg-gray-900 rounded-2xl p-3 text-center">
                {stats.vsLastSession !== null ? (
                  <p className={`font-bold ${stats.vsLastSession >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {stats.vsLastSession > 0 ? '+' : ''}{stats.vsLastSession} kg
                  </p>
                ) : (
                  <p className="text-gray-500 font-bold">—</p>
                )}
                <p className="text-gray-500 text-xs mt-1">vs dernière séance</p>
              </div>
              <div className="bg-gray-900 rounded-2xl p-3 text-center">
                <p className="text-white font-bold">{stats.sessions}</p>
                <p className="text-gray-500 text-xs mt-1">Séances</p>
              </div>
            </div>
          )}

          {/* Graphique volume total */}
          <div className="bg-gray-900 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-1">Volume total (kg)</h3>
            <p className="text-gray-500 text-xs mb-4">Somme de poids × reps sur la séance</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <XAxis
                  dataKey="sessionId"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(id) => {
                    const point = chartData.find(d => d.sessionId === id)
                    return point ? point.date : id
                  }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '12px', color: '#fff' }}
                  labelFormatter={(id) => {
                    const point = chartData.find(d => d.sessionId === id)
                    return point ? point.date : id
                  }}
                  formatter={(value) => [`${value} kg`, 'Volume']}
                />
                <Line type="monotone" dataKey="volume" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 3 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Graphique poids max */}
          <div className="bg-gray-900 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-1">Poids max soulevé (kg)</h3>
            <p className="text-gray-500 text-xs mb-4">Set le plus lourd par séance</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <XAxis
                  dataKey="sessionId"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(id) => {
                    const point = chartData.find(d => d.sessionId === id)
                    return point ? point.date : id
                  }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '12px', color: '#fff' }}
                  labelFormatter={(id) => {
                    const point = chartData.find(d => d.sessionId === id)
                    return point ? point.date : id
                  }}
                  formatter={(value) => [`${value} kg`, 'Poids max']}
                />
                <Line
                  type="monotone"
                  dataKey="poids"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={{ fill: '#f59e0b', r: 3 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {/* Bouton Supprimer progression */}
            {chartData.length > 0 && (
              <div className="flex justify-end">
                <button
                  className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded-xl text-sm transition-colors"
                  onClick={async () => {
                    if (!selected) return
                    try {
                      setLoadingChart(true)
                      const { data: { user }, error: userError } = await supabase.auth.getUser()
                      if (userError) throw userError

                      // Récupérer les sessions de l'utilisateur
                      const { data: sessions, error: sessionsError } = await supabase
                        .from('workout_sessions')
                        .select('id')
                        .eq('user_id', user.id)
                      if (sessionsError) throw sessionsError

                      const sessionIds = sessions.map(s => s.id)

                      // Supprimer les sets pour cet exercice et ces sessions
                      const { error: deleteError } = await supabase
                        .from('session_sets')
                        .delete()
                        .in('session_id', sessionIds)
                        .eq('exercise_id', selected.id)

                      if (deleteError) throw deleteError

                      // Mettre à jour l'état local
                      setChartData([])
                      setStats(null)

                      // Optionnel : retirer l'exercice de la liste si tu veux
                      setExercises(prev => prev.filter(ex => ex.id !== selected.id))
                      setSelected(null)
                    } catch (err) {
                      console.error("Erreur suppression progression :", err)
                    } finally {
                      setLoadingChart(false)
                    }
                  }}
                >
                  Supprimer la progression
                </button>
              </div>
            )}
        </>
      )}
    </div>
  )
}