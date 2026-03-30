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

export const TEMPLATE_EN = {
  'Dos / Biceps': 'Back / Biceps',
  'Dos/Biceps': 'Back / Biceps',
  'Dos / biceps': 'Back / Biceps',
  'Jambes': 'Legs',
  'Jambes / Fessiers': 'Legs / Glutes',
  'Épaules': 'Shoulders',
  'Épaules / Trapèzes': 'Shoulders / Traps',
  'Pectoraux / Triceps': 'Chest / Triceps',
  'Pectoraux / triceps': 'Chest / Triceps',
  'Pectoraux': 'Chest',
  'Full Body': 'Full Body',
  'Corps entier': 'Full Body',
  'Abdominaux': 'Core / Abs',
  'Cardio': 'Cardio',
  'Biceps / Triceps': 'Biceps / Triceps',
  'Bras': 'Arms',
  'Push': 'Push',
  'Pull': 'Pull',
  'Push / Pull': 'Push / Pull',
  'Haut du corps': 'Upper Body',
  'Bas du corps': 'Lower Body',
}

/**
 * Returns the translated template name if lang === 'en', else the original.
 */
export function tTemplate(name, lang) {
  if (!name) return name
  if (lang !== 'en') return name
  return TEMPLATE_EN[name] || name
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
