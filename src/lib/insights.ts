import { db, todayKey, type RecoveryLog } from './db'

export interface Insight {
  id: string
  type: 'success' | 'warning' | 'info' | 'tip'
  icon: string
  title: string
  body: string
}

interface InsightInput {
  totalKcal: number
  totalProtein: number
  totalBurned: number
  goalKcal: number
  proteinGoalG: number
  foodEntries: { loggedAt: number; portionG: number }[]
  exerciseEntries: { kcalBurned: number }[]
  foodStreak: number
  recovery?: RecoveryLog | null
}

export async function generateInsights(input: InsightInput): Promise<Insight[]> {
  const insights: Insight[] = []
  const {
    totalKcal, totalProtein, totalBurned, goalKcal,
    proteinGoalG, foodEntries, foodStreak, recovery
  } = input

  const net    = totalKcal - totalBurned
  const hour   = new Date().getHours()
  const proteinGap = proteinGoalG - totalProtein

  // ── Calorie balance ──
  if (net > goalKcal + 300) {
    insights.push({
      id: 'over_goal', type: 'warning', icon: '⚠️',
      title: 'Over calorie goal',
      body: `You're ${Math.round(net - goalKcal)} kcal over today's goal. A short walk burns ~200 kcal.`,
    })
  } else if (net <= goalKcal && totalKcal > 0) {
    insights.push({
      id: 'on_track', type: 'success', icon: '✅',
      title: 'On track today',
      body: `${Math.round(goalKcal - net)} kcal remaining. You're doing great.`,
    })
  } else if (hour >= 18 && totalKcal < goalKcal * 0.5) {
    insights.push({
      id: 'undereating', type: 'warning', icon: '🍽️',
      title: "You've barely eaten today",
      body: 'Skipping meals can spike hunger later and slow metabolism. Have a balanced meal now.',
    })
  }

  // ── Protein ──
  if (proteinGap > 20) {
    const suggestions = proteinGap > 40
      ? 'Try adding paneer, eggs, chicken, or dal to your next meal.'
      : 'A Greek yogurt or handful of nuts would close the gap.'
    insights.push({
      id: 'protein_gap', type: 'tip', icon: '💪',
      title: `${Math.round(proteinGap)}g protein short`,
      body: suggestions,
    })
  } else if (totalProtein >= proteinGoalG) {
    insights.push({
      id: 'protein_done', type: 'success', icon: '🥩',
      title: 'Protein goal hit!',
      body: `${Math.round(totalProtein)}g — muscles will thank you.`,
    })
  }

  // ── Late-night eating ──
  const lateEntries = foodEntries.filter(e => new Date(e.loggedAt).getHours() >= 21)
  if (lateEntries.length > 0) {
    const lateKcal = lateEntries.reduce((s, _e) => s, 0)
    insights.push({
      id: 'late_eating', type: 'warning', icon: '🌙',
      title: 'Late-night eating detected',
      body: `Food after 9 PM is harder to burn. ${lateKcal > 0 ? `About ${Math.round(lateKcal)} kcal logged late.` : ''}`,
    })
  }

  // ── Exercise praise ──
  if (totalBurned >= 400) {
    insights.push({
      id: 'great_burn', type: 'success', icon: '🔥',
      title: `${Math.round(totalBurned)} kcal burned!`,
      body: 'Excellent activity today. Your metabolism stays elevated for hours after exercise.',
    })
  }

  // ── Streak ──
  if (foodStreak >= 7) {
    insights.push({
      id: 'streak_7', type: 'success', icon: '🏆',
      title: `${foodStreak}-day streak!`,
      body: "Consistency is the #1 predictor of success. You're building a real habit.",
    })
  } else if (foodStreak >= 3) {
    insights.push({
      id: 'streak_3', type: 'info', icon: '🔥',
      title: `${foodStreak}-day logging streak`,
      body: 'Keep it up — data quality improves dramatically after 7 days.',
    })
  }

  // ── Recovery insights ──
  if (recovery) {
    if (recovery.sleepHours < 6) {
      insights.push({
        id: 'low_sleep', type: 'warning', icon: '😴',
        title: 'Low sleep detected',
        body: 'Under 6h sleep raises cortisol, increases appetite by ~300 kcal/day, and slows recovery.',
      })
    }
    if (recovery.stressLevel >= 4) {
      insights.push({
        id: 'high_stress', type: 'warning', icon: '🧠',
        title: 'High stress today',
        body: 'Stress often triggers emotional eating. Pause before snacking — is it hunger or stress?',
      })
    }
    if (recovery.soreness >= 4) {
      insights.push({
        id: 'high_soreness', type: 'info', icon: '🦵',
        title: 'High muscle soreness',
        body: 'Consider active recovery or lighter training. Protein and sleep speed up repair.',
      })
    }
  }

  // ── Emotional eating pattern (check last 7 days) ──
  try {
    const today = todayKey()
    let lateEatingDays = 0, highStressDays = 0
    for (let i = 1; i <= 7; i++) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const key = todayKey(d)
      if (key >= today) continue
      const [entries, rec] = await Promise.all([
        db.log.where('dateKey').equals(key).toArray(),
        db.recoveryLog.where('dateKey').equals(key).first(),
      ])
      if (entries.some(e => new Date(e.loggedAt).getHours() >= 21)) lateEatingDays++
      if (rec && rec.stressLevel >= 4) highStressDays++
    }
    if (lateEatingDays >= 3 && highStressDays >= 2) {
      insights.push({
        id: 'emotional_pattern', type: 'tip', icon: '🧩',
        title: 'Pattern: stress → late eating',
        body: `You've eaten late on ${lateEatingDays} of the last 7 days — often on high-stress days. Building a wind-down routine may help.`,
      })
    }
  } catch { /* non-critical */ }

  return insights.slice(0, 4)
}

export async function getTodayRecovery(): Promise<RecoveryLog | null> {
  const key = todayKey()
  return (await db.recoveryLog.where('dateKey').equals(key).first()) ?? null
}
