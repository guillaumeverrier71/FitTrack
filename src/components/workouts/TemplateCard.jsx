import { Play, Trash2, Copy } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function TemplateCard({ template, onStart, onDelete, onDuplicate }) {
  const exercises = template.template_exercises || []

  const handleDelete = async () => {
    if (!confirm('Supprimer cette séance ?')) return

    // Détache les sessions du template sans supprimer l'historique de progression
    await supabase
      .from('workout_sessions')
      .update({ template_id: null })
      .eq('template_id', template.id)

    // Supprime uniquement le programme et ses exercices
    await supabase.from('template_exercises').delete().eq('template_id', template.id)
    await supabase.from('workout_templates').delete().eq('id', template.id)

    onDelete()
  }

  const handleDuplicate = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    const { data: newTemplate } = await supabase
      .from('workout_templates')
      .insert({ name: `${template.name} (copie)`, user_id: user.id })
      .select()
      .single()

    if (newTemplate && exercises.length > 0) {
      await supabase.from('template_exercises').insert(
        exercises.map((te, i) => ({
          template_id: newTemplate.id,
          exercise_id: te.exercise_id,
          sets_target: te.sets_target,
          reps_target: te.reps_target,
          order_index: i,
        }))
      )
    }

    onDuplicate?.()
  }

  return (
    <div className="bg-gray-900 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-white font-semibold text-lg">{template.name}</h2>
          {template.is_default && (
            <span className="text-xs bg-indigo-950 text-indigo-400 px-2 py-0.5 rounded-full">Modèle</span>
          )}
        </div>
        <div className="flex gap-2">
          {template.is_default ? (
            <button
              onClick={handleDuplicate}
              className="text-gray-500 hover:text-indigo-400 p-2 rounded-lg transition-colors"
              title="Dupliquer pour personnaliser"
            >
              <Copy size={18} />
            </button>
          ) : (
            <button
              onClick={handleDelete}
              className="text-gray-500 hover:text-red-400 p-2 rounded-lg transition-colors"
            >
              <Trash2 size={18} />
            </button>
          )}
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