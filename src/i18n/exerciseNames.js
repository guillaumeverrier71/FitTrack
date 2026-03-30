// Mapping FR → EN for exercise names and muscle group names stored in the DB.
// Keys are the exact French strings from Supabase. Add new entries as needed.

export const MUSCLE_GROUP_EN = {
  'Pectoraux': 'Chest',
  'Dos': 'Back',
  'Épaules': 'Shoulders',
  'Biceps': 'Biceps',
  'Triceps': 'Triceps',
  'Abdominaux': 'Core / Abs',
  'Jambes': 'Legs',
  'Quadriceps': 'Quads',
  'Ischio-jambiers': 'Hamstrings',
  'Fessiers': 'Glutes',
  'Mollets': 'Calves',
  'Avant-bras': 'Forearms',
  'Cardio': 'Cardio',
  'Corps entier': 'Full Body',
  'Trapèzes': 'Traps',
  'Lombaires': 'Lower Back',
}

export const EXERCISE_EN = {
  // Poitrine / Chest
  'Développé couché': 'Bench Press',
  'Développé couché incliné': 'Incline Bench Press',
  'Développé couché décliné': 'Decline Bench Press',
  'Développé haltères': 'Dumbbell Press',
  'Développé haltères incliné': 'Incline Dumbbell Press',
  'Écarté haltères': 'Dumbbell Flyes',
  'Pompes': 'Push-ups',
  'Dips': 'Dips',
  'Pull-over': 'Pullover',
  'Pec deck': 'Pec Deck',
  'Câbles croisés': 'Cable Crossover',

  // Dos / Back
  'Tractions': 'Pull-ups',
  'Tractions prise large': 'Wide-grip Pull-ups',
  'Tractions prise serrée': 'Close-grip Pull-ups',
  'Rowing barre': 'Barbell Row',
  'Rowing haltère': 'Dumbbell Row',
  'Rowing câble': 'Cable Row',
  'Tirage vertical': 'Lat Pulldown',
  'Tirage horizontal': 'Seated Row',
  'Soulevé de terre': 'Deadlift',
  'Soulevé de terre roumain': 'Romanian Deadlift',
  'Good morning': 'Good Morning',
  'Face pull': 'Face Pull',
  'Shrugs': 'Shrugs',

  // Épaules / Shoulders
  'Développé militaire': 'Overhead Press',
  'Développé Arnold': 'Arnold Press',
  'Élévations latérales': 'Lateral Raises',
  'Élévations frontales': 'Front Raises',
  'Oiseau': 'Rear Delt Fly',
  'Élévations arrière': 'Rear Delt Raises',
  'Upright row': 'Upright Row',

  // Biceps
  'Curl barre': 'Barbell Curl',
  'Curl haltères': 'Dumbbell Curl',
  'Curl concentré': 'Concentration Curl',
  'Curl marteau': 'Hammer Curl',
  'Curl câble': 'Cable Curl',
  'Curl incliné': 'Incline Curl',
  'Curl 21': '21s Curl',

  // Triceps
  'Extension triceps': 'Tricep Extension',
  'Extension triceps poulie': 'Tricep Pushdown',
  'Barre au front': 'Skull Crusher',
  'Dips triceps': 'Tricep Dips',
  'Kickback': 'Kickback',
  'Extension derrière la tête': 'Overhead Tricep Extension',

  // Jambes / Legs
  'Squat': 'Squat',
  'Squat bulgare': 'Bulgarian Split Squat',
  'Squat sumo': 'Sumo Squat',
  'Squat gobelet': 'Goblet Squat',
  'Fentes': 'Lunges',
  'Fentes marchées': 'Walking Lunges',
  'Leg press': 'Leg Press',
  'Hack squat': 'Hack Squat',
  'Leg extension': 'Leg Extension',
  'Leg curl': 'Leg Curl',
  'Leg curl couché': 'Lying Leg Curl',
  'Mollets debout': 'Standing Calf Raises',
  'Mollets assis': 'Seated Calf Raises',
  'Hip thrust': 'Hip Thrust',
  'Abduction': 'Hip Abduction',
  'Adduction': 'Hip Adduction',
  'Step-up': 'Step-up',

  // Abdominaux / Core
  'Crunch': 'Crunch',
  'Crunch câble': 'Cable Crunch',
  'Relevé de jambes': 'Leg Raises',
  'Planche': 'Plank',
  'Planche latérale': 'Side Plank',
  'Russian twist': 'Russian Twist',
  'Gainage': 'Plank Hold',
  'Abdos roue': 'Ab Wheel Rollout',
  'Mountain climber': 'Mountain Climber',
  'Bicycle crunch': 'Bicycle Crunch',
  'Dragon flag': 'Dragon Flag',

  // Cardio
  'Course à pied': 'Running',
  'Vélo': 'Cycling',
  'Vélo stationnaire': 'Stationary Bike',
  'Rameur': 'Rowing Machine',
  'Corde à sauter': 'Jump Rope',
  'Burpees': 'Burpees',
  'Jumping jacks': 'Jumping Jacks',
  'HIIT': 'HIIT',
  'Elliptique': 'Elliptical',
  'Natation': 'Swimming',

  // Corps entier / Full Body
  'Soulevé de terre hexagonal': 'Hex Bar Deadlift',
  'Kettlebell swing': 'Kettlebell Swing',
  'Arraché': 'Snatch',
  'Épaulé-jeté': 'Clean & Jerk',
  'Thruster': 'Thruster',
  'Clean': 'Clean',
}

// Keys are lowercased + spaces removed for fuzzy matching
const TEMPLATE_EN_RAW = {
  'dos/biceps': 'Back / Biceps',
  'dos/bicep': 'Back / Biceps',
  'jambes': 'Legs',
  'jambes/fessiers': 'Legs / Glutes',
  'fessiers': 'Glutes',
  'épaules': 'Shoulders',
  'epaules': 'Shoulders',
  'épaules/trapèzes': 'Shoulders / Traps',
  'epaules/trapezes': 'Shoulders / Traps',
  'épaules/triceps': 'Shoulders / Triceps',
  'epaules/triceps': 'Shoulders / Triceps',
  'épaules/triceps/pecs': 'Shoulders / Triceps / Chest',
  'epaules/triceps/pecs': 'Shoulders / Triceps / Chest',
  'épaules/triceps/pectoraux': 'Shoulders / Triceps / Chest',
  'epaules/triceps/pectoraux': 'Shoulders / Triceps / Chest',
  'pectoraux/triceps': 'Chest / Triceps',
  'pecs/triceps': 'Chest / Triceps',
  'pectoraux': 'Chest',
  'pecs': 'Chest',
  'fullbody': 'Full Body',
  'corpsentier': 'Full Body',
  'abdominaux': 'Core / Abs',
  'abdos': 'Core / Abs',
  'cardio': 'Cardio',
  'biceps/triceps': 'Biceps / Triceps',
  'bras': 'Arms',
  'push': 'Push',
  'pull': 'Pull',
  'push/pull': 'Push / Pull',
  'hauducorps': 'Upper Body',
  'haut du corps': 'Upper Body',
  'basducorps': 'Lower Body',
  'bas du corps': 'Lower Body',
  'mollets': 'Calves',
  'trapèzes': 'Traps',
  'trapezes': 'Traps',
  'lombaires': 'Lower Back',
  'quadriceps': 'Quads',
  'ischio-jambiers': 'Hamstrings',
}

function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/\s*[/]\s*/g, '/') // normalize slashes
    .replace(/\s+/g, '') // remove spaces
}

/**
 * Returns the translated template name if lang === 'en', else the original.
 */
export function tTemplate(name, lang) {
  if (!name) return name
  if (lang !== 'en') return name
  return TEMPLATE_EN_RAW[normalize(name)] || name
}

/**
 * Returns the translated exercise name if lang === 'en', else the original.
 */
export function tExercise(name, lang) {
  if (!name) return name
  if (lang !== 'en') return name
  return EXERCISE_EN[name] || name
}

/**
 * Returns the translated muscle group name if lang === 'en', else the original.
 */
export function tMuscle(name, lang) {
  if (!name) return name
  if (lang !== 'en') return name
  return MUSCLE_GROUP_EN[name] || name
}
