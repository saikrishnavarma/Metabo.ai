import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Trash2, Flame, Utensils, TrendingDown, TrendingUp } from 'lucide-react'
import { db, todayKey, getStreaks, type LogEntry, type Food, type ExerciseLog } from '../lib/db'
import { macrosForPortion, fmtTime } from '../lib/format'
import { useProfile } from '../hooks/useProfile'
import { generateInsights, getTodayRecovery, type Insight } from '../lib/insights'
import { calcBMR, calcTDEE, type ActivityLevel } from '../lib/bodySimulation'

interface HydratedEntry extends LogEntry { food: Food | undefined }

export default function HistoryPage() {
  const nav    = useNavigate()
  const { profile } = useProfile()
  const today  = todayKey()
  const goal   = profile?.goalKcal ?? 2000

  // Auto-calculate maintenance from body stats
  const bmr  = calcBMR(profile?.weightKg ?? 70, profile?.heightCm ?? 170, profile?.age ?? 25, profile?.sex ?? 'male')
  const tdee = calcTDEE(bmr, (profile?.activityLevel ?? 'moderate') as ActivityLevel)

  const [insights, setInsights] = useState<Insight[]>([])

  const entries = useLiveQuery(async (): Promise<HydratedEntry[]> => {
    const log = await db.log.where('dateKey').equals(today).reverse().sortBy('loggedAt')
    const foods = await db.foods.bulkGet([...new Set(log.map(l => l.foodId))])
    const byId = new Map<number, Food>()
    for (const f of foods) if (f?.id != null) byId.set(f.id, f)
    return log.map(l => ({ ...l, food: byId.get(l.foodId) }))
  }, [today]) ?? []

  const exercises = useLiveQuery(() =>
    db.exerciseLog.where('dateKey').equals(today).reverse().sortBy('loggedAt')
  , [today]) ?? []

  let totalKcal = 0, totalP = 0, totalC = 0, totalF = 0
  for (const e of entries) {
    if (!e.food) continue
    const m = macrosForPortion(e.food, e.portionG)
    totalKcal += m.kcal; totalP += m.protein; totalC += m.carbs; totalF += m.fat
  }

  const totalBurned = exercises.reduce((s, e) => s + e.kcalBurned, 0)
  const net         = Math.round(totalKcal - totalBurned)
  const consumedPct = Math.min(100, Math.round((totalKcal / tdee) * 100))
  const burnedPct   = Math.min(100, Math.round((totalBurned / tdee) * 100))

  useEffect(() => {
    getStreaks().then(({ food }) => {
      getTodayRecovery().then(recovery => {
        generateInsights({
          totalKcal, totalProtein: totalP, totalBurned,
          goalKcal: goal, proteinGoalG: profile?.proteinGoalG ?? 120,
          foodEntries: entries.map(e => ({ loggedAt: e.loggedAt, portionG: e.portionG })),
          exerciseEntries: exercises as any[],
          foodStreak: food, recovery,
        }).then(setInsights)
      })
    })
  }, [totalKcal, totalP, totalBurned, entries.length, exercises.length])

  return (
    <div className="space-y-4 pt-2">

      {/* ── AI Insights ── */}
      {insights.length > 0 && (
        <div className="space-y-2">
          {insights.map(ins => (
            <div key={ins.id} className="flex items-start gap-3 px-3 py-2.5 rounded-2xl"
              style={{
                background: ins.type === 'success' ? 'rgba(168,85,247,0.08)'
                  : ins.type === 'warning' ? 'rgba(251,146,60,0.08)'
                  : 'rgba(0,212,255,0.08)',
                border: `1px solid ${ins.type === 'success' ? 'rgba(168,85,247,0.2)' : ins.type === 'warning' ? 'rgba(251,146,60,0.2)' : 'rgba(0,212,255,0.2)'}`,
              }}>
              <span className="text-base shrink-0 mt-0.5">{ins.icon}</span>
              <div>
                <div className="text-sm font-semibold text-white">{ins.title}</div>
                <div className="text-xs mt-0.5" style={{ color: '#71717a' }}>{ins.body}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Top summary ── */}
      <section className="card space-y-4">
        <h3 className="label">Today's balance</h3>

        {/* Maintenance vs net row */}
        <div className="grid grid-cols-2 gap-2">
          {/* Net calories */}
          <div className="rounded-2xl p-3"
            style={{
              background: net <= tdee ? 'rgba(168,85,247,0.08)' : 'rgba(248,113,113,0.08)',
              border: `1px solid ${net <= tdee ? 'rgba(168,85,247,0.2)' : 'rgba(248,113,113,0.2)'}`,
            }}>
            <div className="flex items-center gap-1.5 mb-1">
              {net <= tdee
                ? <TrendingDown size={13} style={{ color: '#a855f7' }} />
                : <TrendingUp   size={13} style={{ color: '#f87171' }} />}
              <span className="text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: net <= tdee ? '#a855f7' : '#f87171' }}>
                {net <= tdee ? 'Deficit' : 'Surplus'}
              </span>
            </div>
            <div className="text-2xl font-extrabold text-white">{net}</div>
            <div className="text-[10px] mt-0.5" style={{ color: '#71717a' }}>
              net kcal · {Math.abs(tdee - net)} {net <= tdee ? 'under' : 'over'} maintenance
            </div>
          </div>

          {/* Maintenance (TDEE) */}
          <div className="rounded-2xl p-3"
            style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.18)' }}>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#00d4ff' }}>
                Maintenance
              </span>
            </div>
            <div className="text-2xl font-extrabold text-white">{tdee}</div>
            <div className="text-[10px] mt-0.5" style={{ color: '#71717a' }}>
              kcal/day · your TDEE
            </div>
          </div>
        </div>

        {/* Goal bar */}
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span style={{ color: '#71717a' }}>Goal: {goal} kcal</span>
            <span style={{ color: net <= goal ? '#a855f7' : '#f87171' }}>
              {net <= goal ? `${goal - net} remaining` : `${net - goal} over`}
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.round(net / goal * 100))}%`, background: net <= goal ? 'linear-gradient(90deg,#a855f7,#00d4ff)' : '#f87171' }} />
          </div>
        </div>

        {/* Consumed vs Burned bars */}
        <div className="space-y-3">
          <CalBar
            label="Consumed"
            icon={<Utensils size={13} />}
            value={Math.round(totalKcal)}
            pct={consumedPct}
            color="#00d4ff"
            sublabel={`${entries.length} food items`}
          />
          <CalBar
            label="Burned"
            icon={<Flame size={13} />}
            value={Math.round(totalBurned)}
            pct={burnedPct}
            color="#fb923c"
            sublabel={`${exercises.length} ${exercises.length === 1 ? 'activity' : 'activities'}`}
          />
        </div>

        {/* Macro grid */}
        <div className="grid grid-cols-3 gap-2">
          <Macro label="Protein" value={totalP} unit="g" color="#00d4ff" />
          <Macro label="Carbs"   value={totalC} unit="g" color="#a78bfa" />
          <Macro label="Fat"     value={totalF} unit="g" color="#fb923c" />
        </div>
      </section>

      {/* ── Food log ── */}
      <section className="card">
        <h3 className="label mb-3">Food log</h3>
        {entries.length === 0
          ? <div className="text-sm text-center py-6" style={{ color: '#71717a' }}>No food logged yet — scan, search or add manually.</div>
          : (
            <ul className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              {entries.map(e => {
                const m = e.food ? macrosForPortion(e.food, e.portionG) : { kcal: 0 }
                return (
                  <li key={e.id} className="flex items-center gap-3 py-2.5">
                    <button onClick={() => e.food?.id && nav(`/food/${e.food.id}`)} className="flex-1 flex items-center gap-3 text-left">
                      {e.food?.imageUrl
                        ? <img src={e.food.imageUrl} alt="" className="w-10 h-10 rounded-xl object-cover" style={{ background: '#050507' }} />
                        : <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                            style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)' }}>🍽️</div>}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold truncate text-white">{e.food?.name ?? 'Removed food'}</div>
                        <div className="text-xs" style={{ color: '#71717a' }}>{e.portionG}g · {e.mealType} · {fmtTime(e.loggedAt)}</div>
                      </div>
                      <div className="font-bold text-sm" style={{ color: '#00d4ff' }}>+{Math.round(m.kcal)}</div>
                    </button>
                    <button onClick={() => e.id && db.log.delete(e.id)} className="p-1.5 rounded-lg shrink-0" style={{ color: '#71717a' }}>
                      <Trash2 size={15} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
      </section>

      {/* ── Exercise log ── */}
      {exercises.length > 0 && (
        <section className="card">
          <h3 className="label mb-3">Exercise log</h3>
          <ul className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            {(exercises as ExerciseLog[]).map(e => (
              <li key={e.id} className="flex items-center gap-3 py-2.5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                  style={{ background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.2)' }}>
                  {e.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white">{e.name}</div>
                  <div className="text-xs" style={{ color: '#71717a' }}>{e.durationMin} min · {fmtTime(e.loggedAt)}</div>
                </div>
                <div className="font-bold text-sm mr-1" style={{ color: '#fb923c' }}>−{Math.round(e.kcalBurned)}</div>
                <button onClick={() => e.id && db.exerciseLog.delete(e.id)} className="p-1.5 rounded-lg shrink-0" style={{ color: '#71717a' }}>
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function CalBar({ label, icon, value, pct, color, sublabel }: {
  label: string; icon: React.ReactNode; value: number; pct: number; color: string; sublabel: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color }}>
          {icon} {label}
        </div>
        <div className="text-xs" style={{ color: '#71717a' }}>{value} kcal · {sublabel}</div>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

function Macro({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)' }}>
      <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color }}>{label}</div>
      <div className="font-extrabold text-base text-white">
        {Math.round(value)}<span className="text-xs font-normal ml-0.5" style={{ color: '#71717a' }}>{unit}</span>
      </div>
    </div>
  )
}
