import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useWorkouts() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchTemplates = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data, error } = await supabase
      .from('workout_templates')
      .select(`*, template_exercises (*, exercises (name, muscle_group_id, gif_url))`)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!data) { setLoading(false); return }

    const { data: muscleGroups } = await supabase.from('muscle_groups').select('*')

    const enriched = data.map(template => ({
      ...template,
      template_exercises: (template.template_exercises || []).map(te => ({
        ...te,
        exercises: te.exercises ? {
          ...te.exercises,
          muscle_groups: muscleGroups?.find(mg => mg.id === te.exercises.muscle_group_id) || null
        } : null
      }))
    }))

    setTemplates(enriched)
    setLoading(false)
  }

  useEffect(() => { fetchTemplates() }, [])

  return { templates, loading, refetch: fetchTemplates }
}