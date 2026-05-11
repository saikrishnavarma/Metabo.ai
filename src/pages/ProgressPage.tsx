import { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Scale, TrendingDown, Trophy } from 'lucide-react'
import { db, logWeight, todayKey, getStreaks } from '../lib/db'
import { useProfile } from '../hooks/useProfile'
import {
  calcBMR, calcTDEE, estimateBodyFat, projectWeight, levelFromXP, xpFromCounts,
  weightChangeExplanation, type ActivityLevel,
} from '../lib/bodySimulation'

export default function ProgressPage() {
  const { profile } = useProfile()

  const weightLogs = useLiveQuery(async () => {
    const all = await db.weightLog.orderBy('loggedAt').toArray()
    return all.slice(-30)
  }, []) ?? []

  const [streaks, setStreaks]           = useState({ food: 0, exercise: 0 })
  const [xp, setXp]                     = useState(0)
  const [weightInput, setWeightInput]   = useState('')
  const [noteInput, setNoteInput]       = useState('')
  const [weightSaved, setWeightSaved]   = useState(false)

  const totalFoodLogs     = useLiveQuery(() => db.log.count(), []) ?? 0
  const totalExerciseLogs = useLiveQuery(() => db.exerciseLog.count(), []) ?? 0

  useEffect(() => { getStreaks().then(setStreaks) }, [])
  useEffect(() => {
    setXp(xpFromCounts(totalFoodLogs, totalExerciseLogs, streaks.food))
  }, [totalFoodLogs, totalExerciseLogs, streaks.food])

  const { level, title, nextXP, progress: xpPct } = levelFromXP(xp)

  const recentWeights = (weightLogs as any[]).slice(-8)
  const weightChange  = recentWeights.length >= 2
    ? recentWeights[recentWeights.length - 1].weightKg - recentWeights[0].weightKg
    : 0

  const w   = profile?.weightKg ?? 70
  const h   = profile?.heightCm ?? 170
  const ag  = profile?.age ?? 25
  const sx  = profile?.sex ?? 'male'
  const al  = (profile?.activityLevel ?? 'moderate') as ActivityLevel
  const goal = profile?.goalKcal ?? 2000

  const bmr   = calcBMR(w, h, ag, sx)
  const tdee  = calcTDEE(bmr, al)
  const bfPct = estimateBodyFat(w, h, ag, sx)
  const projection = projectWeight(w, goal, tdee, 12)

  const chartData = (weightLogs as any[]).map((log: any) => ({
    date: log.dateKey.slice(5),
    weight: log.weightKg,
  }))

  async function saveWeight() {
    const kg = parseFloat(weightInput)
    if (!kg || kg < 20 || kg > 300) return
    await logWeight(kg, noteInput || undefined)
    const p = await db.profile.get('me')
    if (p) await db.profile.put({ ...p, weightKg: kg })
    setWeightSaved(true); setWeightInput(''); setNoteInput('')
    setTimeout(() => setWeightSaved(false), 1500)
  }

  return (
    <div className="space-y-4 pt-2 pb-4">

      {/* ── XP / Level ── */}
      <section className="rounded-2xl p-4"
        style={{ background: 'linear-gradient(135deg,rgba(167,139,250,0.15),rgba(0,212,255,0.1))', border: '1px solid rgba(167,139,250,0.3)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-lg"
              style={{ background: 'linear-gradient(135deg,#a78bfa,#00d4ff)', color: '#050507' }}>
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
        <StreakCard label="Food streak" value={streaks.food}     icon="🍽️" color="#a855f7" />
        <StreakCard label="Exercise streak" value={streaks.exercise} icon="🏃" color="#fb923c" />
      </div>

      {/* ── Body Stats ── */}
      <section className="card">
        <h3 className="label mb-3">Body stats</h3>
        <div className="grid grid-cols-3 gap-2">
          <StatBox label="Weight"    value={`${w} kg`}    color="#00d4ff" />
          <StatBox label="Body fat ~" value={`${bfPct}%`} color="#a78bfa" />
          <StatBox label="TDEE"      value={`${tdee}`}    sub="kcal/day" color="#a855f7" />
        </div>
        <div className="mt-3 rounded-xl px-3 py-2.5 text-sm"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <span className="text-white font-semibold">BMR {Math.round(bmr)} kcal</span>
          <span className="text-xs ml-2" style={{ color: '#71717a' }}>· calories at complete rest</span>
        </div>
        {recentWeights.length >= 2 && (
          <div className="mt-3 rounded-xl px-3 py-2.5 text-xs leading-relaxed"
            style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', color: '#e5edff' }}>
            📊 {weightChangeExplanation(weightChange, (goal - tdee) * 7 / 7700, false)}
          </div>
        )}
      </section>

      {/* ── Weight history chart ── */}
      {chartData.length >= 2 && (
        <section className="card">
          <h3 className="label mb-3">Weight history</h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} width={35} />
              <Tooltip
                contentStyle={{ background: 'rgba(20,20,40,0.85)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, fontSize: 12, backdropFilter: 'blur(12px)' }}
                labelStyle={{ color: '#71717a' }} itemStyle={{ color: '#00d4ff' }}
              />
              {profile?.goalWeightKg && (
                <ReferenceLine y={profile.goalWeightKg} stroke="#a855f7" strokeDasharray="4 4"
                  label={{ value: 'Goal', fill: '#a855f7', fontSize: 10 }} />
              )}
              <Line type="monotone" dataKey="weight" stroke="#00d4ff" strokeWidth={2} dot={{ fill: '#00d4ff', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* ── Log weight ── */}
      <section className="card space-y-3">
        <h3 className="label flex items-center gap-2"><Scale size={13} /> Log today's weight</h3>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            type="number" inputMode="decimal" placeholder={`${w} kg`}
            value={weightInput} onChange={e => setWeightInput(e.target.value)}
          />
          <button
            onClick={saveWeight}
            disabled={!weightInput || weightSaved}
            className="px-4 rounded-xl font-semibold text-sm shrink-0 disabled:opacity-50 transition-all"
            style={{ background: 'linear-gradient(135deg,rgba(168,85,247,0.82),rgba(0,212,255,0.7))', color: 'white', border: '1px solid rgba(168,85,247,0.4)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)' }}
          >
            {weightSaved ? '✓' : 'Save'}
          </button>
        </div>
        <input className="input text-xs" placeholder="Note (optional — e.g. morning, post-workout)"
          value={noteInput} onChange={e => setNoteInput(e.target.value)} />
      </section>

      {/* ── 12-week projection ── */}
      <section className="card">
        <h3 className="label mb-1 flex items-center gap-2"><TrendingDown size={13} /> 12-week body projection</h3>
        <p className="text-xs mb-3" style={{ color: '#71717a' }}>
          Based on {goal} kcal/day goal vs {tdee} kcal TDEE.
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
              <ReferenceLine y={profile.goalWeightKg} stroke="#fb923c" strokeDasharray="4 4"
                label={{ value: 'Goal', fill: '#fb923c', fontSize: 10 }} />
            )}
            <Line type="monotone" dataKey="weightKg" stroke="#a855f7" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
        {projection.length > 1 && (
          <div className="mt-2 text-sm" style={{ color: '#71717a' }}>
            At 12 weeks: <span className="font-bold text-white">{projection[12]?.weightKg} kg</span>
            {profile?.goalWeightKg && (
              <span className="ml-2" style={{ color: projection[12]?.weightKg <= profile.goalWeightKg ? '#a855f7' : '#fb923c' }}>
                {projection[12]?.weightKg <= profile.goalWeightKg
                  ? '· Goal reached! 🎉'
                  : `· ${(projection[12]?.weightKg - profile.goalWeightKg).toFixed(1)} kg from goal`}
              </span>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

function StreakCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  return (
    <div className="rounded-2xl p-4"
      style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${color}40`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)' }}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-extrabold" style={{ color }}>{value}</div>
      <div className="text-xs mt-0.5" style={{ color: '#71717a' }}>{label}{value === 1 ? '' : 's'}</div>
    </div>
  )
}

function StatBox({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="rounded-xl p-3"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}>
      <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color }}>{label}</div>
      <div className="font-extrabold text-white text-base leading-tight">{value}</div>
      {sub && <div className="text-[10px]" style={{ color: '#71717a' }}>{sub}</div>}
    </div>
  )
}
