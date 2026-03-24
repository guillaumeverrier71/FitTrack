import { Play, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function TemplateCard({ template, onStart, onDelete }) {
  const exercises = template.template_exercises || []

  const handleDelete = async () => {
  if (!confirm('Supprimer cette séance ?')) return
  
  // Supprime d'abord les session_sets liés
  const { data: sessions } = await supabase
    .from('workout_sessions')
    .select('id')
    .eq('template_id', template.id)

  if (sessions?.length > 0) {
    const sessionIds = sessions.map(s => s.id)
    await supabase.from('session_sets').delete().in('session_id', sessionIds)
    await supabase.from('workout_sessions').delete().eq('template_id', template.id)
  }

  // Puis les template_exercises et le template
  await supabase.from('template_exercises').delete().eq('template_id', template.id)
  await supabase.from('workout_templates').delete().eq('id', template.id)
  
  onDelete()
}

  return (
    <div className="bg-gray-900 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-white font-semibold text-lg">{template.name}</h2>
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            className="text-gray-500 hover:text-red-400 p-2 rounded-lg transition-colors"
          >
            <Trash2 size={18} />
          </button>
          <button
            onClick={onStart}
            className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg transition-colors"
          >
            <Play size={18} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {exercises.length === 0 ? (
          <p className="text-gray-500 text-sm">Aucun exercice</p>
        ) : (
          exercises.map(ex => (
            <div key={ex.id} className="flex items-center gap-2">
              <span className="text-indigo-400 text-xs bg-indigo-950 px-2 py-0.5 rounded-full">
                {ex.exercises?.muscle_groups?.name}
              </span>
              <span className="text-gray-300 text-sm">{ex.exercises?.name}</span>
              <span className="text-gray-500 text-xs ml-auto">{ex.sets_target} × {ex.reps_target}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}