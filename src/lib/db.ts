import Dexie, { type Table } from 'dexie'

/* ── Types ── */
export interface Profile {
  id: 'me'
  weightKg: number
  goalKcal: number
  proteinGoalG?: number
  heightCm?: number
  age?: number
  sex?: 'male' | 'female'
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
  goalWeightKg?: number
  goalType?: 'lose' | 'maintain' | 'gain'
  anthropicApiKey?: string
}

export type FoodSource = 'off' | 'nutritionix' | 'manual' | 'gemini' | 'indian' | 'ai' | 'usda'

export interface Food {
  id?: number
  source: FoodSource
  externalId?: string
  name: string
  brand?: string
  imageUrl?: string
  kcalPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  defaultPortionG: number
  createdAt: number
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface LogEntry {
  id?: number
  foodId: number
  portionG: number
  mealType: MealType
  loggedAt: number
  dateKey: string
}

export interface ExerciseLog {
  id?: number
  exerciseId: string
  name: string
  emoji: string
  durationMin: number
  kcalBurned: number
  loggedAt: number
  dateKey: string
}

export interface WeightLog {
  id?: number
  weightKg: number
  loggedAt: number
  dateKey: string
  note?: string
}

export interface RecoveryLog {
  id?: number
  sleepHours: number
  sleepQuality: number   // 1–5
  stressLevel: number    // 1–5
  soreness: number       // 1–5
  loggedAt: number
  dateKey: string
}

export interface ChatLogEntry {
  id?: number
  msgId: string
  dateKey: string
  role: 'user' | 'assistant'
  text: string
  foods?: string
  question?: string | null
  logged?: boolean
  createdAt: number
}

/* ── DB ── */
class MetaboAIDB extends Dexie {
  profile!:             Table<Profile,      'me'>
  foods!:               Table<Food,         number>
  log!:                 Table<LogEntry,     number>
  exerciseLog!:         Table<ExerciseLog,  number>
  weightLog!:           Table<WeightLog,    number>
  recoveryLog!:         Table<RecoveryLog,  number>
  archivedLog!:         Table<LogEntry,     number>
  archivedExerciseLog!: Table<ExerciseLog,  number>
  chatLog!:             Table<ChatLogEntry, number>

  constructor() {
    super('snapbite')
    this.version(1).stores({
      profile: 'id',
      foods:   '++id, externalId, name, createdAt',
      log:     '++id, foodId, dateKey, loggedAt',
    })
    this.version(2).stores({
      profile:     'id',
      foods:       '++id, externalId, name, createdAt',
      log:         '++id, foodId, dateKey, loggedAt',
      exerciseLog: '++id, dateKey, loggedAt',
    })
    this.version(3).stores({
      profile:     'id',
      foods:       '++id, externalId, name, createdAt',
      log:         '++id, foodId, dateKey, loggedAt',
      exerciseLog: '++id, dateKey, loggedAt',
      weightLog:   '++id, dateKey, loggedAt',
      recoveryLog: '++id, dateKey',
    })
    this.version(4).stores({
      profile:             'id',
      foods:               '++id, externalId, name, createdAt',
      log:                 '++id, foodId, dateKey, loggedAt',
      exerciseLog:         '++id, dateKey, loggedAt',
      weightLog:           '++id, dateKey, loggedAt',
      recoveryLog:         '++id, dateKey',
      archivedLog:         '++id, foodId, dateKey, loggedAt',
      archivedExerciseLog: '++id, dateKey, loggedAt',
    })
    this.version(5).stores({
      profile:             'id',
      foods:               '++id, externalId, name, createdAt',
      log:                 '++id, foodId, dateKey, loggedAt',
      exerciseLog:         '++id, dateKey, loggedAt',
      weightLog:           '++id, dateKey, loggedAt',
      recoveryLog:         '++id, dateKey',
      archivedLog:         '++id, foodId, dateKey, loggedAt',
      archivedExerciseLog: '++id, dateKey, loggedAt',
      chatLog:             '++id, dateKey, msgId',
    })
  }
}

export const db = new MetaboAIDB()

/* ── Helpers ── */
export function todayKey(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export async function ensureProfile(): Promise<Profile> {
  const existing = await db.profile.get('me')
  if (existing) return existing
  const fresh: Profile = { id: 'me', weightKg: 70, goalKcal: 2000, proteinGoalG: 120 }
  await db.profile.put(fresh)
  return fresh
}

export async function logFood(foodId: number, portionG: number, mealType: MealType = 'snack', dateKey?: string) {
  const now = new Date()
  return db.log.add({ foodId, portionG, mealType, loggedAt: now.getTime(), dateKey: dateKey ?? todayKey(now) })
}

export async function logExercise(entry: Omit<ExerciseLog, 'id' | 'loggedAt' | 'dateKey'>, dateKey?: string) {
  const now = new Date()
  return db.exerciseLog.add({ ...entry, loggedAt: now.getTime(), dateKey: dateKey ?? todayKey(now) })
}

export async function upsertFoodByExternalId(food: Omit<Food, 'id' | 'createdAt'>): Promise<number> {
  if (food.externalId) {
    const existing = await db.foods.where('externalId').equals(food.externalId).first()
    if (existing?.id) return existing.id
  }
  return db.foods.add({ ...food, createdAt: Date.now() })
}

export async function logWeight(weightKg: number, note?: string) {
  const now = new Date()
  const key = todayKey(now)
  const existing = await db.weightLog.where('dateKey').equals(key).first()
  if (existing?.id) {
    await db.weightLog.update(existing.id, { weightKg, note, loggedAt: now.getTime() })
    return existing.id
  }
  return db.weightLog.add({ weightKg, note, loggedAt: now.getTime(), dateKey: key })
}

/** Moves entries older than 3 editable days into the archive tables. */
export async function archiveOldEntries(): Promise<void> {
  // Entries with dateKey < (2 days ago) are older than 3 editable days
  const d = new Date(); d.setDate(d.getDate() - 2)
  const cutoff = todayKey(d)

  const oldFood = await db.log.where('dateKey').below(cutoff).toArray()
  if (oldFood.length > 0) {
    await db.archivedLog.bulkAdd(oldFood.map(({ id: _id, ...e }) => e))
    await db.log.bulkDelete(oldFood.map(e => e.id!))
  }

  const oldExercise = await db.exerciseLog.where('dateKey').below(cutoff).toArray()
  if (oldExercise.length > 0) {
    await db.archivedExerciseLog.bulkAdd(oldExercise.map(({ id: _id, ...e }) => e))
    await db.exerciseLog.bulkDelete(oldExercise.map(e => e.id!))
  }
}

export async function getStreaks(): Promise<{ food: number; exercise: number }> {
  const today = todayKey()
  let foodStreak = 0, exerciseStreak = 0
  for (let i = 0; i < 365; i++) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const key = todayKey(d)
    if (key > today) continue
    const [foodActive, foodArchived, exActive, exArchived] = await Promise.all([
      db.log.where('dateKey').equals(key).count(),
      db.archivedLog.where('dateKey').equals(key).count(),
      db.exerciseLog.where('dateKey').equals(key).count(),
      db.archivedExerciseLog.where('dateKey').equals(key).count(),
    ])
    const foodCount = foodActive + foodArchived
    const exCount   = exActive   + exArchived
    if (i === 0 || foodStreak === i) { if (foodCount > 0) foodStreak = i + 1; else if (i > 0) break }
    if (i === 0 || exerciseStreak === i) { if (exCount > 0) exerciseStreak = i + 1 }
  }
  return { food: foodStreak, exercise: exerciseStreak }
}
