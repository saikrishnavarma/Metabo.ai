import { useEffect, useState } from 'react'
import { Save, LogOut, Key, Brain, Eye, EyeOff } from 'lucide-react'
import { useProfile } from '../hooks/useProfile'
import { useAuth } from '../context/AuthContext'
import { db } from '../lib/db'
import { ACTIVITY_LABELS, calcBMR, calcTDEE, type ActivityLevel } from '../lib/bodySimulation'

export default function ProfilePage() {
  const { profile, setProfile } = useProfile()
  const { signOut, user } = useAuth()

  const [weight,     setWeight]     = useState('70')
  const [height,     setHeight]     = useState('170')
  const [age,        setAge]        = useState('25')
  const [sex,        setSex]        = useState<'male' | 'female'>('male')
  const [activity,   setActivity]   = useState<ActivityLevel>('moderate')
  const [goalType,   setGoalType]   = useState<'lose' | 'maintain' | 'gain'>('lose')
  const [goalWeight, setGoalWeight] = useState('')
  const [goal,       setGoal]       = useState('2000')
  const [protein,    setProtein]    = useState('120')
  const [apiKey,     setApiKey]     = useState('')
  const [showKey,    setShowKey]    = useState(false)
  const [saved,      setSaved]      = useState(false)

  useEffect(() => {
    if (!profile) return
    setWeight(String(profile.weightKg))
    setHeight(String(profile.heightCm ?? 170))
    setAge(String(profile.age ?? 25))
    setSex(profile.sex ?? 'male')
    setActivity((profile.activityLevel ?? 'moderate') as ActivityLevel)
    setGoalType(profile.goalType ?? 'lose')
    setGoalWeight(profile.goalWeightKg ? String(profile.goalWeightKg) : '')
    setGoal(String(profile.goalKcal))
    setProtein(String(profile.proteinGoalG ?? 120))
    setApiKey(profile.anthropicApiKey ?? '')
  }, [profile])

  const bmr  = calcBMR(Number(weight) || 70, Number(height) || 170, Number(age) || 25, sex)
  const tdee = calcTDEE(bmr, activity)
  const suggested = goalType === 'lose' ? tdee - 500 : goalType === 'gain' ? tdee + 300 : tdee

  async function save() {
    await setProfile({
      weightKg:        Number(weight)    || 70,
      heightCm:        Number(height)    || 170,
      age:             Number(age)       || 25,
      sex,
      activityLevel:   activity,
      goalType,
      goalWeightKg:    goalWeight ? Number(goalWeight) : undefined,
      goalKcal:        Number(goal)      || 2000,
      proteinGoalG:    Number(protein)   || 120,
      anthropicApiKey: apiKey.trim() || undefined,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 1200)
  }

  async function clearAll() {
    if (!confirm('Delete every logged meal and food?')) return
    await db.log.clear(); await db.foods.clear()
    await db.exerciseLog.clear(); await db.weightLog.clear(); await db.recoveryLog.clear()
  }

  return (
    <div className="space-y-4 pt-2 pb-4">

      {/* ── Body & Activity ── */}
      <section className="card space-y-4">
        <h3 className="label">Body profile</h3>

        <div className="grid grid-cols-2 gap-3">
          <PField label="Weight (kg)" value={weight} set={setWeight} />
          <PField label="Height (cm)" value={height} set={setHeight} />
          <PField label="Age"         value={age}    set={setAge} />
          <div>
            <div className="label mb-1">Sex</div>
            <div className="flex gap-2 h-[42px]">
              {(['male', 'female'] as const).map(s => (
                <button key={s} onClick={() => setSex(s)}
                  className="flex-1 rounded-xl text-sm font-semibold border capitalize transition-all"
                  style={sex === s
                    ? { background: 'rgba(168,85,247,0.2)', borderColor: 'rgba(168,85,247,0.5)', color: '#c084fc' }
                    : { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="label mb-2">Activity level</div>
          <div className="space-y-1.5">
            {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map(al => (
              <button key={al} onClick={() => setActivity(al)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all text-left"
                style={activity === al
                  ? { background: 'rgba(168,85,247,0.15)', borderColor: 'rgba(168,85,247,0.5)' }
                  : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.09)' }}>
                <span className="text-sm text-white">{ACTIVITY_LABELS[al]}</span>
                {activity === al && <span className="text-xs font-bold" style={{ color: '#a855f7' }}>✓</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl px-3 py-2.5"
          style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)' }}>
          <div className="text-xs" style={{ color: '#71717a' }}>Your TDEE · BMR {Math.round(bmr)}</div>
          <div className="text-lg font-extrabold" style={{ color: '#a855f7' }}>{tdee} kcal/day</div>
        </div>
      </section>

      {/* ── Goals ── */}
      <section className="card space-y-4">
        <h3 className="label">Goals</h3>

        <div className="grid grid-cols-3 gap-2">
          {([['lose', '🔥 Lose'], ['maintain', '⚖️ Maintain'], ['gain', '💪 Build']] as const).map(([t, l]) => (
            <button key={t} onClick={() => setGoalType(t)}
              className="py-2.5 rounded-xl text-xs font-semibold border transition-all"
              style={goalType === t
                ? { background: 'linear-gradient(135deg,rgba(168,85,247,0.82),rgba(0,212,255,0.7))', color: 'white', border: '1px solid rgba(168,85,247,0.45)' }
                : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.4)' }}>
              {l}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <PField label="Daily calories (kcal)" value={goal}       set={setGoal} />
          <PField label="Protein goal (g)"      value={protein}    set={setProtein} />
          <PField label="Goal weight (kg)"       value={goalWeight} set={setGoalWeight} placeholder="Optional" />
        </div>

        {goalType !== 'maintain' && (
          <div className="text-xs px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)' }}>
            💡 Suggested: <span className="text-white font-semibold">{suggested} kcal/day</span>
            <span className="ml-1">{goalType === 'lose' ? '(500 kcal deficit)' : '(300 kcal surplus)'}</span>
          </div>
        )}

        <button className="btn-primary w-full" onClick={save}>
          <Save size={16} /> {saved ? 'Saved ✓' : 'Save changes'}
        </button>
      </section>

      {/* ── AI key ── */}
      <section className="card space-y-3">
        <h3 className="label flex items-center gap-2"><Brain size={13} /> AI Companion</h3>
        <div>
          <div className="label mb-1 flex items-center gap-1"><Key size={11} /> Anthropic API key</div>
          <div className="relative">
            <input
              className="input pr-10 text-sm"
              type={showKey ? 'text' : 'password'}
              placeholder="sk-ant-…"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowKey(v => !v)}
              style={{ color: '#71717a' }}>
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-xs mt-1" style={{ color: '#71717a' }}>Stored locally · get yours at console.anthropic.com</p>
        </div>
      </section>

      {/* ── Account ── */}
      <section className="card space-y-3">
        <h3 className="label">Account</h3>
        <p className="text-sm truncate" style={{ color: '#71717a' }}>{user?.email}</p>
        <button className="btn-ghost w-full text-red-300 border-red-400/30" onClick={signOut}>
          <LogOut size={16} /> Sign out
        </button>
      </section>

      {/* ── Data ── */}
      <section className="card">
        <h3 className="label">Data</h3>
        <p className="text-sm mt-2" style={{ color: '#71717a' }}>All data is stored locally on this device.</p>
        <button className="btn-ghost w-full mt-3 text-red-300 border-red-400/30" onClick={clearAll}>
          Erase all data
        </button>
      </section>
    </div>
  )
}

function PField({ label, value, set, placeholder }: {
  label: string; value: string; set: (v: string) => void; placeholder?: string
}) {
  return (
    <div>
      <div className="label mb-1">{label}</div>
      <input className="input" type="number" inputMode="decimal"
        placeholder={placeholder} value={value} onChange={e => set(e.target.value)} />
    </div>
  )
}
