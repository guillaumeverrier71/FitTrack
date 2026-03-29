import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useLang } from '../../context/LangContext'

export default function CreateTemplateModal({ onClose, onCreated }) {
  const { t } = useLang()
  const [name, setName] = useState('')
  const [exercises, setExercises] = useState([])
  const [allExercises, setAllExercises] = useState([])
  const [muscleGroups, setMuscleGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchExercises = async () => {
      const { data: groups } = await supabase.from('muscle_groups').select('*').order('name')
      const { data: exos } = await supabase.from('exercises').select('*, muscle_groups(name)').order('name')
      setMuscleGroups(groups || [])
      setAllExercises(exos || [])
      setSelectedGroup(groups?.[0]?.id || null)
    }
    fetchExercises()
  }, [])

  const filteredExercises = allExercises.filter(e =>
    search.trim()
      ? e.name.toLowerCase().includes(search.toLowerCase())
      : e.muscle_group_id === selectedGroup
  )

  const addExercise = (exo) => {
    if (exercises.find(e => e.exercise_id === exo.id)) return
    setExercises([...exercises, {
      exercise_id: exo.id,
      name: exo.name,
      sets_target: 3,
      reps_target: 10,
    }])
  }

  const removeExercise = (exerciseId) => {
    setExercises(exercises.filter(e => e.exercise_id !== exerciseId))
  }

  const updateExercise = (exerciseId, field, value) => {
    setExercises(exercises.map(e =>
      e.exercise_id === exerciseId ? { ...e, [field]: parseInt(value) || 0 } : e
    ))
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    const { data: template } = await supabase
      .from('workout_templates')
      .insert({ name: name.trim(), user_id: user.id })
      .select()
      .single()

    if (exercises.length > 0) {
      await supabase.from('template_exercises').insert(
        exercises.map((e, i) => ({
          template_id: template.id,
          exercise_id: e.exercise_id,
          sets_target: e.sets_target,
          reps_target: e.reps_target,
          order_index: i,
        }))
      )
    }

    setLoading(false)
    onCreated()
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end">
      <div className="bg-gray-900 w-full rounded-t-3xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-white font-semibold text-lg">{t('createTemplate.title')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">

          {/* Nom */}
          <input
            placeholder={t('createTemplate.namePlaceholder')}
            value={name}
            onChange={e => setName(e.target.value)}
            className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500"
          />

          {/* Exercices ajoutés */}
          {exercises.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-gray-400 text-sm font-medium">{t('progress.exercise')}s</h3>
              {exercises.map(ex => (
                <div key={ex.exercise_id} className="bg-gray-800 rounded-xl p-3 flex items-center gap-3">
                  <span className="text-white text-sm flex-1">{ex.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-center">
                      <span className="text-gray-500 text-xs">{t('createTemplate.sets')}</span>
                      <input
                        type="number"
                        value={ex.sets_target}
                        onChange={e => updateExercise(ex.exercise_id, 'sets_target', e.target.value)}
                        className="bg-gray-700 text-white text-center rounded-lg w-12 py-1 outline-none"
                      />
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-gray-500 text-xs">{t('createTemplate.reps')}</span>
                      <input
                        type="number"
                        value={ex.reps_target}
                        onChange={e => updateExercise(ex.exercise_id, 'reps_target', e.target.value)}
                        className="bg-gray-700 text-white text-center rounded-lg w-12 py-1 outline-none"
                      />
                    </div>
                    <button
                      onClick={() => removeExercise(ex.exercise_id)}
                      className="text-gray-500 hover:text-red-400 ml-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bibliothèque */}
          <div className="flex flex-col gap-3">
            <h3 className="text-gray-400 text-sm font-medium">{t('createTemplate.addBtn')} {t('progress.exercise').toLowerCase()}s</h3>

            {/* Recherche */}
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder={t('createTemplate.searchPlaceholder')}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-gray-800 text-white rounded-xl pl-9 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 w-full text-sm placeholder-gray-500"
              />
            </div>

            {/* Filtre groupe musculaire */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {muscleGroups.map(g => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGroup(g.id)}
                  className={`whitespace-nowrap text-xs px-3 py-1.5 rounded-full transition-colors ${
                    selectedGroup === g.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>

            {/* Liste exercices */}
            <div className="flex flex-col gap-2">
              {filteredExercises.map(exo => {
                const added = exercises.find(e => e.exercise_id === exo.id)
                return (
                  <button
                    key={exo.id}
                    onClick={() => addExercise(exo)}
                    disabled={!!added}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                      added
                        ? 'bg-indigo-950 text-indigo-400'
                        : 'bg-gray-800 text-white hover:bg-gray-700'
                    }`}
                  >
                    {exo.gif_url && (
                      <img
                        src={exo.gif_url}
                        alt={exo.name}
                        className="w-10 h-10 rounded-lg object-cover bg-gray-700"
                        onError={e => e.target.style.display = 'none'}
                      />
                    )}
                    <span className="text-sm flex-1 text-left">{exo.name}</span>
                    {added ? (
                      <span className="text-xs text-indigo-400">{t('createTemplate.addedBtn')} ✓</span>
                    ) : (
                      <Plus size={16} className="text-gray-400" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleSave}
            disabled={!name.trim() || loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? t('createTemplate.creating') : t('createTemplate.createBtn')}
          </button>
        </div>
      </div>
    </div>
  )
}
