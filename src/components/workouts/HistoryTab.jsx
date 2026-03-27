import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, Dumbbell, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'

function formatDate(dateStr) {
  const todayStr = new Date().toISOString().split('T')[0]
  const yesterdayDate = new Date()
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)
  const yesterdayStr = yesterdayDate.toISOString().split('T')[0]
  if (dateStr === todayStr) return "Aujourd'hui"
  if (dateStr === yesterdayStr) return 'Hier'
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function formatDuration(start, end) {
  if (!start || !end) return null
  const mins = Math.round((new Date(end) - new Date(start)) / 60000)
  if (mins < 1) return null
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

function SessionCard({ session }) {
  const [open, setOpen] = useState(false)
  const [sets, setSets] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    // Toggle open immediately for responsiveness
    setOpen(o => !o)

    // Only fetch if opening and not yet fetched
    if (!open && sets === null) {
      setLoading(true)
      try {
        const { data: setsData, error: setsError } = await supabase
          .from('session_sets')
          .select('exercise_id, set_number, reps, weight_kg')
          .eq('session_id', session.id)
          .order('exercise_id')
          .order('set_number')

        if (setsError) throw setsError

        if (setsData && setsData.length > 0) {
          const ids = [...new Set(setsData.map(s => s.exercise_id))]
          const { data: exercisesData } = await supabase
            .from('exercises')
            .select('id, name, muscle_groups(name)')
            .in('id', ids)

          const exMap = Object.fromEntries((exercisesData || []).map(e => [e.id, e]))
          setSets(setsData.map(s => ({ ...s, ex: exMap[s.exercise_id] || null })))
        } else {
          setSets(setsData || [])
        }
      } catch {
        setSets([])
      }
      setLoading(false)
    }
  }

  // Group sets by exercise_id in order of first appearance
  const grouped = []
  const seen = {}
  for (const s of (sets || [])) {
    if (!seen[s.exercise_id]) {
      seen[s.exercise_id] = { name: s.ex?.name || '—', muscle: s.ex?.muscle_groups?.name || null, sets: [] }
      grouped.push(seen[s.exercise_id])
    }
    seen[s.exercise_id].sets.push(s)
  }

  const duration = formatDuration(session.created_at, session.finished_at)

  return (
    <div className="bg-gray-900 rounded-2xl overflow-hidden">
      <button onClick={handleToggle} className="w-full flex items-center justify-between p-4 text-left">
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold truncate">
            {session.workout_templates?.name || 'Séance libre'}
          </p>
          <div className="flex items-center gap-3 mt-1">
            {duration && (
              <span className="text-gray-500 text-xs flex items-center gap-1">
                <Clock size={11} />{duration}
              </span>
            )}
            {sets !== null && (
              <span className="text-gray-500 text-xs">
                {sets.length} série{sets.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        {open
          ? <ChevronDown size={18} className="text-gray-500 shrink-0 ml-2" />
          : <ChevronRight size={18} className="text-gray-500 shrink-0 ml-2" />
        }
      </button>

      {open && (
        <div className="border-t border-gray-800 px-4 pb-4">
          {loading ? (
            <p className="text-gray-500 text-sm py-3">Chargement...</p>
          ) : grouped.length === 0 ? (
            <p className="text-gray-500 text-sm py-3">Aucune série enregistrée</p>
          ) : (
            <div className="flex flex-col gap-4 pt-3">
              {grouped.map((ex, i) => (
                <div key={i}>
                  <div className="flex items-center gap-2 mb-2">
                    {ex.muscle && (
                      <span className="text-indigo-400 text-xs bg-indigo-950 px-2 py-0.5 rounded-full shrink-0">
                        {ex.muscle}
                      </span>
                    )}
                    <span className="text-white text-sm font-medium">{ex.name}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {ex.sets.map((s, j) => (
                      <div key={j} className="flex items-center gap-3 bg-gray-800 rounded-xl px-3 py-2">
                        <span className="text-gray-500 text-xs w-14">Série {s.set_number}</span>
                        <span className="text-white text-sm">{s.reps} reps</span>
                        {s.weight_kg > 0 && (
                          <span className="text-gray-400 text-sm">× {s.weight_kg} kg</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function HistoryTab() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchHistory = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data, error } = await supabase
        .from('workout_sessions')
        .select('*, workout_templates(name)')
        .eq('user_id', user.id)
        .not('finished_at', 'is', null)
        .order('finished_at', { ascending: false })

      if (!error) setSessions(data || [])
      setLoading(false)
    }
    fetchHistory()
  }, [])

  if (loading) {
    return <p className="text-gray-400 text-center mt-10">Chargement...</p>
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center mt-20 gap-2 px-6">
        <Dumbbell size={40} className="text-gray-700" />
        <p className="text-gray-400 text-center">Aucune séance terminée pour l'instant.</p>
        <p className="text-gray-600 text-xs text-center">Lance une séance et clique sur "Terminer ✓" pour qu'elle apparaisse ici.</p>
      </div>
    )
  }

  // Group sessions by day (YYYY-MM-DD from finished_at)
  const byDay = []
  const dayMap = {}
  for (const s of sessions) {
    const date = s.finished_at.split('T')[0]
    if (!dayMap[date]) {
      dayMap[date] = []
      byDay.push({ date, sessions: dayMap[date] })
    }
    dayMap[date].push(s)
  }

  return (
    <div className="px-4 pb-4 flex flex-col gap-4">
      {byDay.map(({ date, sessions: daySessions }) => (
        <div key={date}>
          <p className="text-gray-500 text-xs font-medium capitalize tracking-wider mb-2">
            {formatDate(date)}
          </p>
          <div className="flex flex-col gap-2">
            {daySessions.map(s => <SessionCard key={s.id} session={s} />)}
          </div>
        </div>
      ))}
    </div>
  )
}
