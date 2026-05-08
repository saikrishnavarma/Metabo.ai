import { useEffect, useState } from 'react'
import { Save, LogOut, Key, Brain, Eye, EyeOff } from 'lucide-react'
import { useProfile } from '../hooks/useProfile'
import { useAuth } from '../context/AuthContext'
import { db } from '../lib/db'
import { ACTIVITY_LABELS, calcBMR, calcTDEE, type ActivityLevel } from '../lib/bodySimulation'

export default function ProfilePage() {
  const { profile, setProfile } = useProfile()
  const { signOut, user } = useAuth()

  const [weight,      setWeight]      = useState('70')
  const [goal,        setGoal]        = useState('2000')
  const [protein,     setProtein]     = useState('120')
  const [height,      setHeight]      = useState('170')
  const [age,         setAge]         = useState('25')
  const [sex,         setSex]         = useState<'male' | 'female'>('male')
  const [activity,    setActivity]    = useState<ActivityLevel>('moderate')
  const [goalWeight,  setGoalWeight]  = useState('')
  const [goalType,    setGoalType]    = useState<'lose' | 'maintain' | 'gain'>('lose')
  const [apiKey,      setApiKey]      = useState('')
  const [showKey,     setShowKey]     = useState(false)
  const [saved,       setSaved]       = useState(false)

  useEffect(() => {
    if (!profile) return
    setWeight(String(profile.weightKg))
    setGoal(String(profile.goalKcal))
    setProtein(String(profile.proteinGoalG ?? 120))
    setHeight(String(profile.heightCm ?? 170))
    setAge(String(profile.age ?? 25))
    setSex(profile.sex ?? 'male')
    setActivity((profile.activityLevel ?? 'moderate') as ActivityLevel)
    setGoalWeight(profile.goalWeightKg ? String(profile.goalWeightKg) : '')
    setGoalType(profile.goalType ?? 'lose')
    setApiKey(profile.anthropicApiKey ?? '')
  }, [profile])

  const bmr  = calcBMR(Number(weight) || 70, Number(height) || 170, Number(age) || 25, sex)
  const tdee = calcTDEE(bmr, activity)

  async function save() {
    await setProfile({
      weightKg:       Number(weight)   || 70,
      goalKcal:       Number(goal)     || 2000,
      proteinGoalG:   Number(protein)  || 120,
      heightCm:       Number(height)   || 170,
      age:            Number(age)      || 25,
      sex,
      activityLevel:  activity,
      goalWeightKg:   goalWeight ? Number(goalWeight) : undefined,
      goalType,
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

      {/* ── Body profile ── */}
      <section className="card space-y-4">
        <h3 className="label">Body profile</h3>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Weight (kg)" value={weight} set={setWeight} type="number" />
          <Field label="Height (cm)" value={height} set={setHeight} type="number" />
          <Field label="Age" value={age} set={setAge} type="number" />
          <div>
            <div className="label mb-1">Sex</div>
            <div className="flex gap-2">
              {(['male', 'female'] as const).map(s => (
                <button key={s} onClick={() => setSex(s)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold border capitalize transition-all"
                  style={sex === s
                    ? { background: 'rgba(6,182,212,0.18)', borderColor: 'rgba(6,182,212,0.55)', color: '#67e8f9', boxShadow: '0 0 12px rgba(6,182,212,0.15), inset 0 1px 0 rgba(255,255,255,0.12)' }
                    : { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.4)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Activity level */}
        <div>
          <div className="label mb-2">Activity level</div>
          <div className="space-y-1.5">
            {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map(al => (
              <button key={al} onClick={() => setActivity(al)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all text-left"
                style={activity === al
                  ? { background: 'rgba(168,85,247,0.18)', borderColor: 'rgba(168,85,247,0.5)', boxShadow: '0 0 12px rgba(168,85,247,0.12), inset 0 1px 0 rgba(255,255,255,0.1)' }
                  : { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.09)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}>
                <span className="text-sm text-white">{ACTIVITY_LABELS[al]}</span>
                {activity === al && <span className="text-xs font-bold" style={{ color: '#a855f7' }}>✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* TDEE preview */}
        <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)' }}>
          <div className="text-xs" style={{ color: '#71717a' }}>Your estimated daily burn</div>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl font-extrabold" style={{ color: '#a855f7' }}>{tdee}</span>
            <span className="text-xs" style={{ color: '#71717a' }}>kcal/day TDEE · BMR {Math.round(bmr)}</span>
          </div>
        </div>
      </section>

      {/* ── Goals ── */}
      <section className="card space-y-4">
        <h3 className="label">Goals</h3>

        <div>
          <div className="label mb-2">Goal type</div>
          <div className="grid grid-cols-3 gap-2">
            {([['lose','Lose fat'],['maintain','Maintain'],['gain','Build muscle']] as const).map(([t, l]) => (
              <button key={t} onClick={() => setGoalType(t)}
                className="py-2 rounded-xl text-xs font-semibold border transition-all"
                style={goalType === t
                  ? { background: 'linear-gradient(135deg,rgba(168,85,247,0.82),rgba(0,212,255,0.7))', color: 'white', border: '1px solid rgba(168,85,247,0.45)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)' }
                  : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.4)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Daily calories (kcal)" value={goal} set={setGoal} type="number" />
          <Field label="Protein goal (g)" value={protein} set={setProtein} type="number" />
          <Field label="Goal weight (kg)" value={goalWeight} set={setGoalWeight} type="number" placeholder="Optional" />
        </div>

        {/* Calorie suggestion */}
        {goalType !== 'maintain' && (
          <div className="text-xs px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
            💡 Suggested: <span className="text-white font-semibold">
              {goalType === 'lose' ? tdee - 500 : tdee + 300} kcal/day
            </span>
            {goalType === 'lose' ? ' (500 kcal deficit → ~0.5 kg/week loss)' : ' (300 kcal surplus → lean bulk)'}
          </div>
        )}

        <button className="btn-primary w-full" onClick={save}>
          <Save size={16}/> {saved ? 'Saved ✓' : 'Save profile'}
        </button>
      </section>

      {/* ── AI Settings ── */}
      <section className="card space-y-3">
        <h3 className="label flex items-center gap-2"><Brain size={13}/> AI Companion settings</h3>
        <p className="text-xs" style={{ color: '#71717a' }}>
          Required for the AI Chat tab. Get your key free at <span style={{ color: '#00d4ff' }}>console.anthropic.com</span>
        </p>
        <div>
          <div className="label mb-1 flex items-center gap-1"><Key size={11}/> Anthropic API key</div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                className="input pr-10 text-sm"
                type={showKey ? 'text' : 'password'}
                placeholder="sk-ant-…"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowKey(v => !v)}
                style={{ color: '#71717a' }}>
                {showKey ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
          </div>
          <p className="text-xs mt-1.5" style={{ color: '#71717a' }}>Stored locally on your device only.</p>
        </div>
      </section>

      {/* ── Account ── */}
      <section className="card space-y-3">
        <h3 className="label">Account</h3>
        <p className="text-sm truncate" style={{ color: '#71717a' }}>{user?.email}</p>
        <button className="btn-ghost w-full text-red-300 border-red-400/30" onClick={signOut}>
          <LogOut size={16}/> Sign out
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

function Field({ label, value, set, type, placeholder }: {
  label: string; value: string; set: (v: string) => void; type?: string; placeholder?: string
}) {
  return (
    <div>
      <div className="label mb-1">{label}</div>
      <input className="input" type={type} inputMode={type === 'number' ? 'decimal' : undefined}
        placeholder={placeholder} value={value} onChange={e => set(e.target.value)} />
    </div>
  )
}
