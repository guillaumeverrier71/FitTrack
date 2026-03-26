import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://wpizvmmrztzwinavgetn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwaXp2bW1yenR6d2luYXZnZXRuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDMxNDAxNywiZXhwIjoyMDg5ODkwMDE3fQ.5JKwO-st17FOV-F2YJIk4pcDRovawNg1A0wb1zGsFjI'
)

// IDs corrects basés sur la réponse de l'API
const MUSCLE_MAPPING = {
  1: 'Biceps',      // Biceps brachii
  2: 'Épaules',     // Anterior deltoid
  3: 'Pectoraux',   // Serratus anterior
  4: 'Pectoraux',   // Pectoralis major
  5: 'Triceps',     // Triceps brachii
  6: 'Abdominaux',  // Rectus abdominis
  7: 'Jambes',      // Gastrocnemius
  8: 'Jambes',      // Gluteus maximus
  9: 'Dos',         // Trapezius
  10: 'Jambes',     // Quadriceps femoris
  11: 'Jambes',     // Biceps femoris (Hamstrings)
  12: 'Dos',        // Latissimus dorsi
  13: 'Biceps',     // Brachialis
  14: 'Abdominaux', // Obliquus externus
  15: 'Jambes',     // Soleus
}

async function fetchAll(url) {
  let results = []
  let next = url
  while (next) {
    const res = await fetch(next, { headers: { 'Accept': 'application/json' } })
    const data = await res.json()
    results = [...results, ...(data.results || [])]
    next = data.next
    if (next) await new Promise(r => setTimeout(r, 300))
  }
  return results
}

async function main() {
  console.log('Récupération des groupes musculaires Supabase...')
  const { data: muscleGroups } = await supabase.from('muscle_groups').select('*')
  const groupMap = {}
  muscleGroups.forEach(g => groupMap[g.name] = g.id)
  console.log('Groupes:', groupMap)

  console.log('Récupération des exercices wger...')
  const exerciseInfo = await fetchAll('https://wger.de/api/v2/exerciseinfo/?format=json&language=2&limit=100')
  console.log(`${exerciseInfo.length} exercices récupérés`)

  // Debug — affiche les 3 premiers pour voir la structure
  console.log('Structure premier exercice:', JSON.stringify(exerciseInfo[0], null, 2))

  await supabase.from('exercises').delete().eq('is_custom', false)
  console.log('Anciens exercices supprimés')

  let inserted = 0
  let skipped = 0
  let noMuscle = 0
  let noName = 0

  for (const ex of exerciseInfo) {
    // Cherche le nom en anglais (language 2)
    const translation = ex.translations?.find(t => t.language === 2)
    const name = translation?.name
    if (!name || name.trim() === '') { noName++; skipped++; continue }

    // Cherche le muscle principal
    const muscleId = ex.muscles?.[0]?.id || ex.muscles_secondary?.[0]?.id
    const muscleName = MUSCLE_MAPPING[muscleId]
    if (!muscleName || !groupMap[muscleName]) { noMuscle++; skipped++; continue }

    const gifUrl = ex.images?.[0]?.image || null

    const { error } = await supabase.from('exercises').insert({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      muscle_group_id: groupMap[muscleName],
      is_custom: false,
      user_id: null,
      gif_url: gifUrl ? `https://wger.de${gifUrl}` : null,
      instructions: translation?.description?.replace(/<[^>]*>/g, '') || null,
    })

    if (!error) inserted++
    else { console.log('Erreur insert:', error.message, name); skipped++ }
  }

  console.log(`✅ ${inserted} exercices insérés`)
  console.log(`❌ ${skipped} ignorés (${noName} sans nom, ${noMuscle} sans muscle)`)
}

main().catch(console.error)