export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary:  1.2,
  light:      1.375,
  moderate:   1.55,
  active:     1.725,
  very_active: 1.9,
}

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary:   'Sedentary (desk job, no exercise)',
  light:       'Lightly active (1–3 days/week)',
  moderate:    'Moderately active (3–5 days/week)',
  active:      'Very active (6–7 days/week)',
  very_active: 'Athlete (2× training/day)',
}

/** Mifflin-St Jeor BMR */
export function calcBMR(weightKg: number, heightCm: number, age: number, sex: 'male' | 'female'): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return sex === 'male' ? base + 5 : base - 161
}

export function calcTDEE(bmr: number, activity: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIER[activity])
}

/** Deurenberg BMI-based body fat estimate */
export function estimateBodyFat(weightKg: number, heightCm: number, age: number, sex: 'male' | 'female'): number {
  const bmi = weightKg / (heightCm / 100) ** 2
  const sexFactor = sex === 'male' ? 1 : 0
  return Math.max(5, Math.round(1.2 * bmi + 0.23 * age - 10.8 * sexFactor - 5.4))
}

export interface WeekPoint { week: number; weightKg: number; label: string }

/** Projects weight over N weeks given daily caloric intake vs TDEE */
export function projectWeight(
  startKg: number,
  dailyCalories: number,
  tdee: number,
  weeks = 12,
): WeekPoint[] {
  const weeklyDeficit = (tdee - dailyCalories) * 7  // positive = losing
  const weeklyChange  = weeklyDeficit / 7700         // kg per week (7700 kcal ≈ 1 kg fat)

  return Array.from({ length: weeks + 1 }, (_, i) => {
    const kg = Math.max(30, startKg - weeklyChange * i)
    const d  = new Date(); d.setDate(d.getDate() + i * 7)
    return {
      week: i,
      weightKg: Math.round(kg * 10) / 10,
      label: i === 0 ? 'Now' : `W${i}`,
    }
  })
}

export function weightChangeExplanation(
  actualChange: number,
  expectedChange: number,
  avgSodiumHigh: boolean,
): string {
  const diff = actualChange - expectedChange
  if (Math.abs(actualChange) < 0.3) return 'Weight is stable — normal daily fluctuation (±1 kg is water/glycogen).'

  if (actualChange > 0 && expectedChange <= 0) {
    const reasons: string[] = []
    if (avgSodiumHigh) reasons.push('high sodium (water retention)')
    reasons.push('glycogen storage from carbs', 'natural daily fluctuation')
    return `Gained ${actualChange.toFixed(1)} kg despite a deficit — likely ${reasons.slice(0, 2).join(' + ')}, not fat. Stay consistent.`
  }

  if (actualChange < 0) {
    const fatLoss = Math.abs(expectedChange)
    const water   = Math.abs(diff)
    if (water > 0.2) {
      return `Lost ${Math.abs(actualChange).toFixed(1)} kg — ~${fatLoss.toFixed(1)} kg fat loss, rest is water. Great progress.`
    }
    return `Lost ${Math.abs(actualChange).toFixed(1)} kg this week. Estimated fat loss: ${fatLoss.toFixed(1)} kg.`
  }

  return `Weight ${actualChange > 0 ? '+' : ''}${actualChange.toFixed(1)} kg. Expected: ${expectedChange > 0 ? '+' : ''}${expectedChange.toFixed(1)} kg based on your intake.`
}

export function xpFromCounts(foodLogs: number, exerciseLogs: number, streak: number): number {
  return foodLogs * 10 + exerciseLogs * 15 + Math.min(streak, 30) * 5
}

export function levelFromXP(xp: number): { level: number; title: string; nextXP: number; progress: number } {
  const thresholds = [0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 11000, 15000]
  const titles     = ['Rookie', 'Tracker', 'Consistent', 'Dedicated', 'Athlete', 'Champion', 'Elite', 'Legend', 'Master', 'Supreme']

  let level = 0
  for (let i = 1; i < thresholds.length; i++) {
    if (xp >= thresholds[i]) level = i
    else break
  }

  const currentXP = thresholds[level]
  const nextXP    = thresholds[Math.min(level + 1, thresholds.length - 1)]
  const progress  = nextXP > currentXP ? Math.round(((xp - currentXP) / (nextXP - currentXP)) * 100) : 100

  return { level: level + 1, title: titles[level] ?? 'Supreme', nextXP, progress }
}
