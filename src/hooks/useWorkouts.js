import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function enrichTemplates(templates, muscleGroups) {
  return templates.map(template => ({
    ...template,
    template_exercises: (template.template_exercises || []).map(te => ({
      ...te,
      exercises: te.exercises ? {
        ...te.exercises,
        muscle_groups: muscleGroups?.find(mg => mg.id === te.exercises.muscle_group_id) || null
      } : null
    }))
  }))
}

export function useWorkouts() {
  const [templates, setTemplates] = useState([])
  const [defaultTemplates, setDefaultTemplates] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchTemplates = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const [{ data: userTemplates }, { data: defTemplates }, { data: muscleGroups }] = await Promise.all([
      supabase
        .from('workout_templates')
        .select(`*, template_exercises (*, exercises (name, muscle_group_id, gif_url))`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('workout_templates')
        .select(`*, template_exercises (*, exercises (name, muscle_group_id, gif_url))`)
        .eq('is_default', true)
        .order('name', { ascending: true }),
      supabase.from('muscle_groups').select('*'),
    ])

    setTemplates(enrichTemplates(userTemplates || [], muscleGroups || []))
    setDefaultTemplates(enrichTemplates(defTemplates || [], muscleGroups || []))
    setLoading(false)
  }

  useEffect(() => { fetchTemplates() }, [])

  return { templates, defaultTemplates, loading, refetch: fetchTemplates }
}