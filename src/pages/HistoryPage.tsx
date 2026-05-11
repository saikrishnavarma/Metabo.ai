import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { Trash2, Flame, Utensils, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { db, todayKey, getStreaks, archiveOldEntries, type LogEntry, type Food, type ExerciseLog } from '../lib/db'
import { macrosForPortion, fmtTime } from '../lib/format'
import { useProfile } from '../hooks/useProfile'
import { generateInsights, getTodayRecovery, type Insight } from '../lib/insights'
import { calcBMR, calcTDEE, type ActivityLevel } from '../lib/bodySimulation'
import { useDateContext } from '../context/DateContext'

interface HydratedEntry extends LogEntry { food: Food | undefined }

function dateKeyFromOffset(offset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return todayKey(d)
}

function offsetFromDateKey(dateKey: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(dateKey + 'T00:00:00')
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

function formatDateLabel(dateKey: string): string {
  const today = todayKey()
  const yesterday = dateKeyFromOffset(-1)
  if (dateKey === today) return 'Today'
  if (dateKey === yesterday) return 'Yesterday'
  const d = new Date(dateKey + 'T00:00:00')
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function CalendarPicker({ selectedDate, onSelect }: { selectedDate: string; onSelect: (key: string) => void }) {
  const todayStr = todayKey()
  const [viewYear, setViewYear]   = useState(() => new Date(selectedDate + 'T00:00:00').getFullYear())
  const [viewMonth, setViewMonth] = useState(() => new Date(selectedDate + 'T00:00:00').getMonth())

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    const now = new Date()
    if (viewYear > now.getFullYear() || (viewYear === now.getFullYear() && viewMonth >= now.getMonth())) return
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const firstDay  = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  while (cells.length % 7 !== 0) cells.push(null)

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const canGoNext  = !(viewYear === new Date().getFullYear() && viewMonth >= new Date().getMonth())

  return (
    <div className="card mt-1 select-none" style={{ padding: '12px' }}>
      {/* Month header */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="p-1 rounded-lg" style={{ color: 'rgba(255,255,255,0.6)' }}>
          <ChevronLeft size={16} />
        </button>
        <span className="text-xs font-bold text-white">{monthLabel}</span>
        <button onClick={nextMonth} disabled={!canGoNext} className="p-1 rounded-lg"
          style={{ color: canGoNext ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)' }}>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-center text-[9px] font-semibold" style={{ color: 'rgba(255,255,255,0.3)' }}>{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const key = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isFuture   = key > todayStr
          const isSelected = key === selectedDate
          const isToday    = key === todayStr
          const isArchived = offsetFromDateKey(key) < -2

          return (
            <button
              key={key}
              disabled={isFuture}
              onClick={() => onSelect(key)}
              className="h-8 w-full relative flex items-center justify-center rounded-lg text-xs font-semibold transition-all"
              style={
                isSelected
                  ? { background: 'linear-gradient(135deg,rgba(168,85,247,0.8),rgba(0,212,255,0.6))', color: '#fff', boxShadow: '0 0 10px rgba(168,85,247,0.4)' }
                  : isToday
                  ? { background: 'rgba(168,85,247,0.18)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.4)' }
                  : isFuture
                  ? { color: 'rgba(255,255,255,0.15)', cursor: 'default' }
                  : isArchived
                  ? { color: 'rgba(255,255,255,0.35)' }
                  : { color: 'rgba(255,255,255,0.75)' }
              }
            >
              {day}
              {isArchived && !isSelected && !isToday && (
                <span className="absolute" style={{ fontSize: 4, bottom: 2, color: '#fb923c' }}>●</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ background: 'rgba(168,85,247,0.5)' }} />
          <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Editable</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
          <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Read-only</span>
        </div>
      </div>
    </div>
  )
}

export default function HistoryPage() {
  const nav    = useNavigate()
  const { profile } = useProfile()
  const { setDayOffset, selectedDate, isToday, isEditable, isArchived } = useDateContext()
  const [calOpen, setCalOpen] = useState(false)
  useEffect(() => { archiveOldEntries() }, [])

  // Auto-calculate maintenance from body stats
  const bmr  = calcBMR(profile?.weightKg ?? 70, profile?.heightCm ?? 170, profile?.age ?? 25, profile?.sex ?? 'male')
  const tdee = calcTDEE(bmr, (profile?.activityLevel ?? 'moderate') as ActivityLevel)

  const [insights, setInsights] = useState<Insight[]>([])

  // Live clock — updates every minute so the prorated budget stays current
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    if (!isToday) return
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [isToday])

  const hoursElapsed  = now.getHours() + now.getMinutes() / 60
  const proratedTDEE  = isToday ? Math.round(tdee * hoursElapsed / 24) : tdee
  const dayPct        = Math.round((hoursElapsed / 24) * 100)
  const timeLabel     = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

  const entries = useLiveQuery(async (): Promise<HydratedEntry[]> => {
    const table = isArchived ? db.archivedLog : db.log
    const log = await table.where('dateKey').equals(selectedDate).reverse().sortBy('loggedAt')
    const foods = await db.foods.bulkGet([...new Set(log.map(l => l.foodId))])
    const byId = new Map<number, Food>()
    for (const f of foods) if (f?.id != null) byId.set(f.id, f)
    return log.map(l => ({ ...l, food: byId.get(l.foodId) }))
  }, [selectedDate, isArchived]) ?? []

  const exercises = useLiveQuery(() => {
    const table = isArchived ? db.archivedExerciseLog : db.exerciseLog
    return table.where('dateKey').equals(selectedDate).reverse().sortBy('loggedAt')
  }, [selectedDate, isArchived]) ?? []

  let totalKcal = 0, totalP = 0, totalC = 0, totalF = 0
  for (const e of entries) {
    if (!e.food) continue
    const m = macrosForPortion(e.food, e.portionG)
    totalKcal += m.kcal; totalP += m.protein; totalC += m.carbs; totalF += m.fat
  }

  const totalBurned    = exercises.reduce((s, e) => s + e.kcalBurned, 0)
  const net            = Math.round(totalKcal - totalBurned)
  const consumed       = Math.round(totalKcal)
  const burned         = Math.round(totalBurned)
  // Remaining = TDEE − consumed (food only, no exercise)
  const remainingBase  = tdee - consumed
  // Goal budget (user's calorie goal, may differ from TDEE via a deficit)
  const goalKcal       = profile?.goalKcal ?? tdee
  const hasDeficit     = goalKcal < tdee
  const goalRemaining  = goalKcal - consumed
  const consumedPct    = Math.min(100, Math.round((consumed / tdee) * 100))
  const burnedPct      = Math.min(100, Math.round((burned / tdee) * 100))
  const canEatMore     = remainingBase

  useEffect(() => {
    if (!isToday) { setInsights([]); return }
    getStreaks().then(({ food }) => {
      getTodayRecovery().then(recovery => {
        generateInsights({
          totalKcal, totalProtein: totalP, totalBurned,
          goalKcal: profile?.goalKcal ?? 2000, proteinGoalG: profile?.proteinGoalG ?? 120,
          foodEntries: entries.map(e => ({ loggedAt: e.loggedAt, portionG: e.portionG })),
          exerciseEntries: exercises as any[],
          foodStreak: food, recovery,
        }).then(setInsights)
      })
    })
  }, [totalKcal, totalP, totalBurned, entries.length, exercises.length, isToday])

  return (
    <div className="space-y-4 pt-2">

      {/* ── Date picker ── */}
      <div>
        <button
          onClick={() => setCalOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <div className="text-left">
            <div className="text-sm font-bold text-white">{formatDateLabel(selectedDate)}</div>
            {isArchived
              ? <div className="text-[10px] mt-0.5" style={{ color: '#fb923c' }}>Read-only (archived)</div>
              : !isToday && <div className="text-[10px]" style={{ color: '#71717a' }}>{selectedDate}</div>
            }
          </div>
          <div className="flex items-center gap-2">
            {!isToday && (
              <button
                onClick={e => { e.stopPropagation(); setDayOffset(0); setCalOpen(false) }}
                className="text-[10px] px-2 py-1 rounded-lg font-semibold"
                style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.3)' }}
              >
                Today
              </button>
            )}
            <CalendarDays size={16} style={{ color: calOpen ? '#c084fc' : 'rgba(255,255,255,0.4)' }} />
          </div>
        </button>

        {calOpen && (
          <CalendarPicker
            selectedDate={selectedDate}
            onSelect={key => { setDayOffset(offsetFromDateKey(key)); setCalOpen(false) }}
          />
        )}
      </div>

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
        <h3 className="label">{formatDateLabel(selectedDate)}'s balance</h3>

        {/* Smart Budget card — today only */}
        {isToday && (
          <div className="space-y-2">
            {/* ── Maintenance row ── */}
            <div className="rounded-2xl p-3"
              style={{ background: remainingBase >= 0 ? 'rgba(168,85,247,0.07)' : 'rgba(248,113,113,0.07)', border: `1px solid ${remainingBase >= 0 ? 'rgba(168,85,247,0.25)' : 'rgba(248,113,113,0.25)'}` }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#a855f7' }}>
                  ⏱ Maintenance · {timeLabel}
                </span>
                <span className="text-[10px]" style={{ color: '#71717a' }}>{dayPct}% of day</span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                {/* Consumed */}
                <div className="rounded-xl p-2.5" style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.15)' }}>
                  <div className="text-[9px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#00d4ff' }}>Consumed</div>
                  <div className="text-2xl font-extrabold text-white">{consumed}</div>
                  <div className="text-[9px] mt-0.5" style={{ color: '#71717a' }}>of {tdee} kcal/day</div>
                </div>
                {/* Remaining (TDEE - consumed, base) */}
                <div className="rounded-xl p-2.5" style={{ background: remainingBase >= 0 ? 'rgba(168,85,247,0.08)' : 'rgba(248,113,113,0.08)', border: `1px solid ${remainingBase >= 0 ? 'rgba(168,85,247,0.2)' : 'rgba(248,113,113,0.2)'}` }}>
                  <div className="text-[9px] font-semibold uppercase tracking-wide mb-1" style={{ color: remainingBase >= 0 ? '#a855f7' : '#f87171' }}>
                    {remainingBase >= 0 ? 'Remaining' : 'Over'}
                  </div>
                  <div className="text-2xl font-extrabold" style={{ color: remainingBase >= 0 ? '#fff' : '#f87171' }}>
                    {Math.abs(remainingBase)}
                  </div>
                  <div className="text-[9px] mt-0.5" style={{ color: '#71717a' }}>kcal left</div>
                </div>
              </div>

              {/* Progress bar: consumed vs TDEE */}
              <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, Math.round((consumed / Math.max(1, tdee)) * 100))}%`, background: remainingBase >= 0 ? 'linear-gradient(90deg,#a855f7,#00d4ff)' : '#f87171' }} />
              </div>

            </div>

            {/* ── Goal / Deficit row (only if goal differs from TDEE) ── */}
            {hasDeficit && (
              <div className="rounded-2xl p-3"
                style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.18)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#00d4ff' }}>
                    🎯 Goal Budget
                  </span>
                  <span className="text-[10px]" style={{ color: '#71717a' }}>−{tdee - goalKcal} kcal deficit</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-xl font-extrabold" style={{ color: goalRemaining >= 0 ? '#fff' : '#f87171' }}>
                      {Math.abs(goalRemaining)}
                    </span>
                    <span className="text-xs ml-1.5" style={{ color: '#71717a' }}>
                      kcal {goalRemaining >= 0 ? 'remaining' : 'over goal'}
                    </span>
                  </div>
                  <span className="text-[10px]" style={{ color: '#71717a' }}>Goal: {goalKcal} kcal</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, Math.round((consumed / Math.max(1, goalKcal)) * 100))}%`, background: goalRemaining >= 0 ? '#00d4ff' : '#f87171' }} />
                </div>
              </div>
            )}
          </div>
        )}

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
          ? <div className="text-sm text-center py-6" style={{ color: '#71717a' }}>{isToday ? 'No food logged yet — scan, search or add manually.' : 'No food logged on this day.'}</div>
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
                    {isEditable && (
                      <button onClick={() => e.id && db.log.delete(e.id)} className="p-1.5 rounded-lg shrink-0" style={{ color: '#71717a' }}>
                        <Trash2 size={15} />
                      </button>
                    )}
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
                {isEditable && (
                  <button onClick={() => e.id && db.exerciseLog.delete(e.id)} className="p-1.5 rounded-lg shrink-0" style={{ color: '#71717a' }}>
                    <Trash2 size={15} />
                  </button>
                )}
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
