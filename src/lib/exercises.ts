/**
 * MET (Metabolic Equivalent of Task) values for common activities.
 * kcal burned ≈ MET × bodyWeightKg × hours
 *
 * Source: Compendium of Physical Activities (Ainsworth et al.)
 */
export interface ExerciseDef {
  id: string
  name: string
  emoji: string
  met: number
  meta: string
}

export const EXERCISES: ExerciseDef[] = [
  { id: 'walk',     name: 'Walking',           emoji: '🚶', met: 3.5,  meta: 'Brisk pace, 5 km/h' },
  { id: 'run',      name: 'Running',           emoji: '🏃', met: 9.8,  meta: '10 km/h'           },
  { id: 'cycle',    name: 'Cycling',           emoji: '🚴', met: 7.5,  meta: 'Moderate, 19 km/h' },
  { id: 'swim',     name: 'Swimming',          emoji: '🏊', met: 8.0,  meta: 'Freestyle, moderate' },
  { id: 'rope',     name: 'Jump Rope',         emoji: '🤸', met: 11.8, meta: 'Moderate'          },
  { id: 'yoga',     name: 'Yoga',              emoji: '🧘', met: 3.0,  meta: 'Vinyasa flow'      },
  { id: 'dance',    name: 'Dancing',           emoji: '💃', met: 5.5,  meta: 'Aerobic'           },
  { id: 'strength', name: 'Strength Training', emoji: '🏋️', met: 6.0, meta: 'Vigorous'          },
  { id: 'hike',     name: 'Hiking',            emoji: '🥾', met: 6.0,  meta: 'Cross-country'     },
  { id: 'rowing',   name: 'Rowing',            emoji: '🚣', met: 7.0,  meta: 'Moderate'          }
]

export function minutesToBurn(kcal: number, met: number, weightKg: number): number {
  if (kcal <= 0 || met <= 0 || weightKg <= 0) return 0
  return Math.max(1, Math.round((kcal / (met * weightKg)) * 60))
}
