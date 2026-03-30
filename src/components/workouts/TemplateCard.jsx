import { useState } from 'react'
import { Trash2, Copy, Play, Dumbbell } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import ConfirmModal from '../ui/ConfirmModal'
import { useLang } from '../../context/LangContext'
import { tExercise, tMuscle, tTemplate } from '../../i18n/exerciseNames'

export default function TemplateCard({ template, onStart, onDelete, onDuplicate }) {
  const { t, lang } = useLang()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const exercises = template.template_exercises || []

  // Groupes musculaires uniques
  const muscleGroups = [...new Set(
    exercises.map(ex => tMuscle(ex.exercises?.muscle_groups?.name, lang)).filter(Boolean)
  )]

  // Stats rapides
  const totalSets = exercises.reduce((acc, ex) => acc + ex.sets_target, 0)
  const estimatedMinutes = Math.round(totalSets * 2.5)

  const handleDelete = async () => {
    await supabase.from('workout_sessions').update({ template_id: null }).eq('template_id', template.id)
    await supabase.from('template_exercises').delete().eq('template_id', template.id)
    await supabase.from('workout_templates').delete().eq('id', template.id)
    onDelete()
  }

  const handleDuplicate = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: newTemplate } = await supabase
      .from('workout_templates')
      .insert({ name: t('workouts.copyOf', { name: template.name }), user_id: user.id })
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
    <div className={`bg-gray-900 rounded-2xl overflow-hidden border-l-4 ${template.is_default ? 'border-indigo-500' : 'border-gray-700'}`}>

      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-white font-bold text-lg leading-tight">{tTemplate(template.name, lang)}</h2>
              {template.is_default && (
                <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/30 shrink-0">
                  {t('workouts.modelBadge')}
                </span>
              )}
            </div>
            {/* Méta : exercices + durée */}
            <p className="text-gray-500 text-xs">
              {t('workouts.exerciseCount', { n: exercises.length, s: exercises.length > 1 ? 's' : '' })} · {t('workouts.estimatedTime', { n: estimatedMinutes })}
            </p>
          </div>

          {/* Actions secondaires */}
          <div className="flex gap-1">
            {template.is_default ? (
              <button
                onClick={handleDuplicate}
                className="text-gray-600 hover:text-indigo-400 p-2 rounded-xl transition-colors"
                title={t('workouts.duplicateTitle')}
              >
                <Copy size={16} />
              </button>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-gray-600 hover:text-red-400 p-2 rounded-xl transition-colors"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Groupes musculaires */}
        {muscleGroups.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {muscleGroups.map(group => (
              <span key={group} className="text-xs bg-gray-800 text-gray-400 px-2.5 py-1 rounded-full">
                {group}
              </span>
            ))}
          </div>
        )}

        {/* Liste exercices */}
        {exercises.length > 0 && (
          <div className="flex flex-col divide-y divide-gray-800">
            {exercises.map(ex => (
              <div key={ex.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <Dumbbell size={13} className="text-gray-600 shrink-0" />
                  <span className="text-gray-300 text-sm">{tExercise(ex.exercises?.name, lang)}</span>
                </div>
                <span className="text-indigo-400 text-xs font-medium bg-indigo-500/10 px-2 py-0.5 rounded-lg">
                  {ex.sets_target} × {ex.reps_target}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bouton Démarrer */}
      <button
        onClick={onStart}
        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold py-3.5 transition-colors"
      >
        <Play size={16} fill="white" />
        {t('workouts.startSession')}
      </button>

      {confirmDelete && (
        <ConfirmModal
          title={t('workouts.deleteTitle')}
          description={t('workouts.deleteDesc', { name: template.name })}
          confirmLabel={t('common.delete')}
          onConfirm={() => { setConfirmDelete(false); handleDelete() }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}
