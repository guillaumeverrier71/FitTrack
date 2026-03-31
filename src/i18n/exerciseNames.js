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
  'Développé incliné': 'Incline Press',
  'Développé couché incliné': 'Incline Bench Press',
  'Développé couché décliné': 'Decline Bench Press',
  'Développé haltères': 'Dumbbell Press',
  'Développé haltères incliné': 'Incline Dumbbell Press',
  'Écarté haltères': 'Dumbbell Flyes',
  'Écarté poulie': 'Cable Flyes',
  'Écarté poulie basse': 'Low Cable Flyes',
  'Écarté poulie haute': 'High Cable Flyes',
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

  // Variantes supplémentaires fréquentes
  'Développé couché barre': 'Barbell Bench Press',
  'Développé incliné haltères': 'Incline Dumbbell Press',
  'Développé décliné haltères': 'Decline Dumbbell Press',
  'Tirage nuque': 'Behind-the-neck Pulldown',
  'Tirage poitrine': 'Chest Pulldown',
  'Rowing unilatéral': 'Single-arm Dumbbell Row',
  'Rowing Yates': 'Yates Row',
  'Traction australienne': 'Australian Pull-up',
  'Prise neutre traction': 'Neutral-grip Pull-up',
  'Développé militaire assis': 'Seated Overhead Press',
  'Développé militaire haltères': 'Dumbbell Shoulder Press',
  'Rotation externe': 'External Rotation',
  'Rotation interne': 'Internal Rotation',
  'Curl spider': 'Spider Curl',
  'Curl pupitre': 'Preacher Curl',
  'Curl reverse': 'Reverse Curl',
  'Extension poulie haute': 'High Cable Tricep Extension',
  'Extension poulie basse': 'Low Cable Tricep Extension',
  'Pushdown corde': 'Rope Pushdown',
  'Presse à jambes': 'Leg Press',
  'Extension quadriceps': 'Quad Extension',
  'Curl ischio': 'Hamstring Curl',
  'Fente arrière': 'Reverse Lunge',
  'Fente latérale': 'Lateral Lunge',
  'Pistol squat': 'Pistol Squat',
  'Pont fessier': 'Glute Bridge',
  'Kickback fessier': 'Glute Kickback',
  'Élévation du bassin': 'Hip Raise',
  'Crunch oblique': 'Oblique Crunch',
  'Relevé de buste': 'Sit-up',
  'Toucher les talons': 'Heel Touch',
  'Windshield wiper': 'Windshield Wiper',
  'Hollow body': 'Hollow Body Hold',
  'L-sit': 'L-sit',
  'Gainage dorsal': 'Back Extension Hold',
  'Superman': 'Superman',
  'Hyperextension': 'Hyperextension',
  'Rowing barre T': 'T-bar Row',
  'Développé haltères inclinés': 'Incline Dumbbell Press',
  'Écarté incliné': 'Incline Dumbbell Flyes',
  'Oiseau câble': 'Cable Rear Delt Fly',
  'Tirage menton': 'Upright Row',
  'Scott curl': 'Preacher Curl',
  'Curl barre EZ': 'EZ Bar Curl',
  'Curl haltère concentré': 'Concentration Curl',
  'Dips lestés': 'Weighted Dips',
  'Pompes diamant': 'Diamond Push-ups',
  'Pompes arquées': 'Archer Push-ups',
  'Squat pause': 'Pause Squat',
  'Box squat': 'Box Squat',
  'Front squat': 'Front Squat',
  'Squat barre haute': 'High Bar Squat',
  'Squat barre basse': 'Low Bar Squat',
  'Good mornings': 'Good Mornings',
  'Tirage buste penché': 'Bent-over Row',
  'Shrug haltères': 'Dumbbell Shrugs',
  'Shrug barre': 'Barbell Shrugs',
  'Élévations latérales câble': 'Cable Lateral Raises',
  'Élévations frontales câble': 'Cable Front Raises',
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
