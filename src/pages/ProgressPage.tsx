import { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Scale, TrendingDown, Trophy, Zap, Moon, Brain, Activity } from 'lucide-react'
import { db, logWeight, todayKey, getStreaks, type RecoveryLog } from '../lib/db'
import { useProfile } from '../hooks/useProfile'
import {
  calcBMR, calcTDEE, estimateBodyFat, projectWeight, levelFromXP, xpFromCounts,
  weightChangeExplanation, type ActivityLevel,
} from '../lib/bodySimulation'

export default function ProgressPage() {
  const { profile } = useProfile()
  const today = todayKey()

  const weightLogs = useLiveQuery(async () => {
    const all = await db.weightLog.orderBy('loggedAt').toArray()
    return all.slice(-30)
  }, []) ?? []

  const todayRecovery = useLiveQuery(() =>
    db.recoveryLog.where('dateKey').equals(today).first()
  , [today])

  const [streaks, setStreaks]       = useState({ food: 0, exercise: 0 })
  const [xp, setXp]                 = useState(0)
  const [weightInput, setWeightInput] = useState('')
  const [noteInput, setNoteInput]   = useState('')
  const [weightSaved, setWeightSaved] = useState(false)
  const [recovery, setRecovery]     = useState<Partial<RecoveryLog>>({
    sleepHours: 7, sleepQuality: 3, stressLevel: 2, soreness: 2,
  })
  const [recSaved, setRecSaved]     = useState(false)

  const totalFoodLogs     = useLiveQuery(() => db.log.count(), []) ?? 0
  const totalExerciseLogs = useLiveQuery(() => db.exerciseLog.count(), []) ?? 0

  useEffect(() => {
    getStreaks().then(setStreaks)
  }, [])

  useEffect(() => {
    if (todayRecovery) setRecovery(todayRecovery)
  }, [todayRecovery])

  useEffect(() => {
    setXp(xpFromCounts(totalFoodLogs, totalExerciseLogs, streaks.food))
  }, [totalFoodLogs, totalExerciseLogs, streaks.food])

  const { level, title, nextXP, progress: xpPct } = levelFromXP(xp)

  // Weight change explanation
  const recentWeights = (weightLogs as any[]).slice(-8)
  const weightChange  = recentWeights.length >= 2
    ? recentWeights[recentWeights.length - 1].weightKg - recentWeights[0].weightKg
    : 0

  // TDEE / simulation
  const w  = profile?.weightKg ?? 70
  const h  = profile?.heightCm ?? 170
  const ag = profile?.age ?? 25
  const sx = profile?.sex ?? 'male'
  const al = (profile?.activityLevel ?? 'moderate') as ActivityLevel
  const goal = profile?.goalKcal ?? 2000

  const bmr  = calcBMR(w, h, ag, sx)
  const tdee = calcTDEE(bmr, al)
  const bfPct = estimateBodyFat(w, h, ag, sx)

  const projection = projectWeight(w, goal, tdee, 12)

  // Chart data for weight history
  const chartData = (weightLogs as any[]).map((log: any) => ({
    date: log.dateKey.slice(5),
    weight: log.weightKg,
  }))

  async function saveWeight() {
    const kg = parseFloat(weightInput)
    if (!kg || kg < 20 || kg > 300) return
    await logWeight(kg, noteInput || undefined)
    // update profile weight too
    const p = await db.profile.get('me')
    if (p) await db.profile.put({ ...p, weightKg: kg })
    setWeightSaved(true); setWeightInput(''); setNoteInput('')
    setTimeout(() => setWeightSaved(false), 1500)
  }

  async function saveRecovery() {
    const now = new Date()
    const key = todayKey(now)
    const existing = await db.recoveryLog.where('dateKey').equals(key).first()
    const entry = { ...recovery, loggedAt: now.getTime(), dateKey: key } as RecoveryLog
    if (existing?.id) await db.recoveryLog.update(existing.id, entry)
    else await db.recoveryLog.add(entry)
    setRecSaved(true)
    setTimeout(() => setRecSaved(false), 1500)
  }

  return (
    <div className="space-y-4 pt-2 pb-4">

      {/* ── XP / Level ── */}
      <section className="rounded-2xl p-4 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg,rgba(167,139,250,0.15),rgba(0,212,255,0.1))', border: '1px solid rgba(167,139,250,0.3)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-lg text-slate-900"
              style={{ background: 'linear-gradient(135deg,#a78bfa,#00d4ff)' }}>
              {level}
            </div>
            <div>
              <div className="font-bold text-white">{title}</div>
              <div className="text-xs" style={{ color: '#71717a' }}>{xp} XP · Level {level}</div>
            </div>
          </div>
          <Trophy size={24} style={{ color: '#a78bfa' }} />
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${xpPct}%`, background: 'linear-gradient(90deg,#a78bfa,#00d4ff)' }} />
        </div>
        <div className="flex justify-between text-[10px] mt-1" style={{ color: '#71717a' }}>
          <span>{xp} XP</span><span>{nextXP} XP for next level</span>
        </div>
      </section>

      {/* ── Streaks ── */}
      <div className="grid grid-cols-2 gap-3">
        <StreakCard label="Food streak" value={streaks.food} icon="🍽️" color="#a855f7" />
        <StreakCard label="Exercise streak" value={streaks.exercise} icon="🏃" color="#fb923c" />
      </div>

      {/* ── Body Stats ── */}
      <section className="card">
        <h3 className="label mb-3">Body stats</h3>
        <div className="grid grid-cols-3 gap-2">
          <StatBox label="Current" value={`${w} kg`} color="#00d4ff" />
          <StatBox label="Body fat ~" value={`${bfPct}%`} color="#a78bfa" />
          <StatBox label="TDEE" value={`${tdee}`} sub="kcal/day" color="#a855f7" />
        </div>
        <div className="mt-3 rounded-xl px-3 py-2.5 text-sm" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <span className="text-white font-semibold">BMR {Math.round(bmr)} kcal</span>
          <span className="text-xs ml-2" style={{ color: '#71717a' }}>· calories to survive at rest</span>
        </div>
        {recentWeights.length >= 2 && (
          <div className="mt-3 rounded-xl px-3 py-2.5 text-xs leading-relaxed" style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', color: '#e5edff' }}>
            <span style={{ color: '#00d4ff' }}>📊 </span>
            {weightChangeExplanation(weightChange, (goal - tdee) * 7 / 7700, false)}
          </div>
        )}
      </section>

      {/* ── Weight chart ── */}
      {chartData.length >= 2 ? (
        <section className="card">
          <h3 className="label mb-3">Weight history</h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} width={35} />
              <Tooltip
                contentStyle={{ background: 'rgba(20,20,40,0.85)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, fontSize: 12, backdropFilter: 'blur(12px)' }}
                labelStyle={{ color: '#71717a' }}
                itemStyle={{ color: '#00d4ff' }}
              />
              {profile?.goalWeightKg && (
                <ReferenceLine y={profile.goalWeightKg} stroke="#a855f7" strokeDasharray="4 4" label={{ value: 'Goal', fill: '#a855f7', fontSize: 10 }} />
              )}
              <Line type="monotone" dataKey="weight" stroke="#00d4ff" strokeWidth={2} dot={{ fill: '#00d4ff', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </section>
      ) : null}

      {/* ── Log weight ── */}
      <section className="card space-y-3">
        <h3 className="label flex items-center gap-2"><Scale size={13}/> Log today's weight</h3>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            type="number" inputMode="decimal" placeholder={`${w} kg`}
            value={weightInput} onChange={e => setWeightInput(e.target.value)}
          />
          <button
            onClick={saveWeight}
            disabled={!weightInput || weightSaved}
            className="px-4 rounded-xl font-semibold text-sm text-slate-900 shrink-0 disabled:opacity-50 transition-all"
            style={{ background: weightSaved ? 'rgba(168,85,247,0.6)' : 'linear-gradient(135deg,rgba(168,85,247,0.82),rgba(0,212,255,0.7))', color: 'white', border: '1px solid rgba(168,85,247,0.4)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)' }}
          >
            {weightSaved ? '✓' : 'Save'}
          </button>
        </div>
        <input className="input text-xs" placeholder="Note (optional — e.g. post-workout, morning)" value={noteInput} onChange={e => setNoteInput(e.target.value)} />
      </section>

      {/* ── Body simulation ── */}
      <section className="card">
        <h3 className="label mb-1 flex items-center gap-2"><TrendingDown size={13}/> 12-week body projection</h3>
        <p className="text-xs mb-3" style={{ color: '#71717a' }}>
          Based on {goal} kcal/day vs {tdee} kcal TDEE. Update goal in Profile.
        </p>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={projection}>
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
            <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} width={35} />
            <Tooltip
              contentStyle={{ background: 'rgba(20,20,40,0.85)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, fontSize: 12, backdropFilter: 'blur(12px)' }}
              itemStyle={{ color: '#a855f7' }}
            />
            {profile?.goalWeightKg && (
              <ReferenceLine y={profile.goalWeightKg} stroke="#fb923c" strokeDasharray="4 4" label={{ value: 'Goal', fill: '#fb923c', fontSize: 10 }} />
            )}
            <Line type="monotone" dataKey="weightKg" stroke="#a855f7" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
        {projection.length > 1 && (
          <div className="mt-2 text-sm" style={{ color: '#71717a' }}>
            At 12 weeks: <span className="font-bold text-white">{projection[12]?.weightKg} kg</span>
            {profile?.goalWeightKg && (
              <span className="ml-2" style={{ color: projection[12]?.weightKg <= profile.goalWeightKg ? '#a855f7' : '#fb923c' }}>
                {projection[12]?.weightKg <= profile.goalWeightKg ? '· Goal reached! 🎉' : `· ${(projection[12]?.weightKg - profile.goalWeightKg).toFixed(1)} kg from goal`}
              </span>
            )}
          </div>
        )}
      </section>

      {/* ── Recovery log ── */}
      <section className="card space-y-4">
        <h3 className="label flex items-center gap-2"><Activity size={13}/> Today's recovery check-in</h3>
        <RecoverySlider icon={<Moon size={13}/>} label="Sleep" value={recovery.sleepHours ?? 7}
          min={0} max={12} step={0.5} unit="hrs"
          onChange={v => setRecovery(r => ({ ...r, sleepHours: v }))} />
        <RecoveryStars label="Sleep quality" value={recovery.sleepQuality ?? 3}
          onChange={v => setRecovery(r => ({ ...r, sleepQuality: v }))} />
        <RecoveryStars label="Stress level" value={recovery.stressLevel ?? 2}
          onChange={v => setRecovery(r => ({ ...r, stressLevel: v }))}
          color="#fb923c" />
        <RecoveryStars label="Muscle soreness" value={recovery.soreness ?? 2}
          onChange={v => setRecovery(r => ({ ...r, soreness: v }))}
          color="#f87171" />
        <button
          onClick={saveRecovery}
          className="w-full py-3 rounded-2xl text-sm font-bold transition-all"
          style={{
            background: recSaved ? 'rgba(168,85,247,0.6)' : 'linear-gradient(135deg,rgba(168,85,247,0.82),rgba(0,212,255,0.7))',
            color: 'white',
            border: '1px solid rgba(168,85,247,0.4)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 4px 16px rgba(168,85,247,0.25)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {recSaved ? '✓ Saved' : 'Save check-in'}
        </button>
      </section>
    </div>
  )
}

function StreakCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${color}40`, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.07)` }}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-extrabold" style={{ color }}>{value}</div>
      <div className="text-xs mt-0.5" style={{ color: '#71717a' }}>{label}{value === 1 ? '' : 's'}</div>
    </div>
  )
}

function StatBox({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}>
      <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color }}>{label}</div>
      <div className="font-extrabold text-white text-base leading-tight">{value}</div>
      {sub && <div className="text-[10px]" style={{ color: '#71717a' }}>{sub}</div>}
    </div>
  )
}

function RecoverySlider({ icon, label, value, min, max, step, unit, onChange }: {
  icon: React.ReactNode; label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-white">{icon} {label}</div>
        <div className="text-xs font-bold" style={{ color: '#a855f7' }}>{value} {unit}</div>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full accent-[#a855f7]" />
    </div>
  )
}

function RecoveryStars({ label, value, onChange, color = '#00d4ff' }: {
  label: string; value: number; onChange: (v: number) => void; color?: string
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold text-white">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <button key={i} onClick={() => onChange(i)}
            className="w-7 h-7 rounded-lg text-xs font-bold transition-all"
            style={i <= value
              ? { background: color + '28', color, border: `1px solid ${color}80`, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.12)` }
              : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.09)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}>
            {i}
          </button>
        ))}
      </div>
    </div>
  )
}
