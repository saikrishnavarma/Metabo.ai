import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { useProfile } from '../hooks/useProfile'
import { ACTIVITY_LABELS, calcBMR, calcTDEE, type ActivityLevel } from '../lib/bodySimulation'

export default function OnboardingPage() {
  const nav = useNavigate()
  const { setProfile } = useProfile()
  const [step, setStep] = useState(0)

  const [weight,     setWeight]     = useState('70')
  const [height,     setHeight]     = useState('170')
  const [age,        setAge]        = useState('25')
  const [sex,        setSex]        = useState<'male' | 'female'>('male')
  const [activity,   setActivity]   = useState<ActivityLevel>('moderate')
  const [goalType,   setGoalType]   = useState<'lose' | 'maintain' | 'gain'>('lose')
  const [goalWeight, setGoalWeight] = useState('')

  const bmr  = calcBMR(Number(weight) || 70, Number(height) || 170, Number(age) || 25, sex)
  const tdee = calcTDEE(bmr, activity)
  const suggestedKcal = goalType === 'lose' ? tdee - 500 : goalType === 'gain' ? tdee + 300 : tdee
  const suggestedProtein = Math.round((suggestedKcal * 0.3) / 4)

  async function finish() {
    await setProfile({
      weightKg:      Number(weight)     || 70,
      heightCm:      Number(height)     || 170,
      age:           Number(age)        || 25,
      sex,
      activityLevel: activity,
      goalType,
      goalWeightKg:  goalWeight ? Number(goalWeight) : undefined,
      goalKcal:      suggestedKcal,
      proteinGoalG:  suggestedProtein,
    })
    nav('/history', { replace: true })
  }

  const canNext = [
    Number(weight) > 0 && Number(height) > 0 && Number(age) > 0,
    true,
    true,
  ][step]

  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-12"
      style={{ background: 'linear-gradient(180deg,#050507 0%,#0a0a12 100%)' }}>

      {/* Progress bar */}
      <div className="flex gap-1.5 mb-10 w-full max-w-sm">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-1 rounded-full flex-1 transition-all duration-300"
            style={{ background: i <= step ? 'linear-gradient(90deg,#a855f7,#00d4ff)' : 'rgba(255,255,255,0.12)' }} />
        ))}
      </div>

      <div className="w-full max-w-sm flex-1 space-y-5">

        {/* ── Step 0: Body stats ── */}
        {step === 0 && (
          <>
            <div className="mb-2">
              <div className="text-3xl mb-2">👋</div>
              <h1 className="text-2xl font-extrabold text-white">Welcome to Metabo.ai</h1>
              <p className="text-sm mt-1" style={{ color: '#71717a' }}>
                A few quick questions to calculate your personal calorie needs.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <OField label="Weight (kg)" value={weight} set={setWeight} />
              <OField label="Height (cm)" value={height} set={setHeight} />
              <OField label="Age" value={age} set={setAge} />
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
          </>
        )}

        {/* ── Step 1: Activity level ── */}
        {step === 1 && (
          <>
            <div className="mb-2">
              <div className="text-3xl mb-2">🏃</div>
              <h2 className="text-2xl font-extrabold text-white">How active are you?</h2>
              <p className="text-sm mt-1" style={{ color: '#71717a' }}>
                Used to calculate your daily calorie burn (TDEE).
              </p>
            </div>

            <div className="space-y-2">
              {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map(al => (
                <button key={al} onClick={() => setActivity(al)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left"
                  style={activity === al
                    ? { background: 'rgba(168,85,247,0.15)', borderColor: 'rgba(168,85,247,0.5)', color: '#fff' }
                    : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.55)' }}>
                  <span className="text-sm">{ACTIVITY_LABELS[al]}</span>
                  {activity === al && <span className="text-xs font-bold" style={{ color: '#a855f7' }}>✓</span>}
                </button>
              ))}
            </div>

            <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(0,212,255,0.07)', border: '1px solid rgba(0,212,255,0.2)' }}>
              <div className="text-[10px]" style={{ color: '#71717a' }}>Your estimated daily burn</div>
              <div className="text-xl font-extrabold" style={{ color: '#00d4ff' }}>{tdee} kcal/day</div>
            </div>
          </>
        )}

        {/* ── Step 2: Goal ── */}
        {step === 2 && (
          <>
            <div className="mb-2">
              <div className="text-3xl mb-2">🎯</div>
              <h2 className="text-2xl font-extrabold text-white">What's your goal?</h2>
              <p className="text-sm mt-1" style={{ color: '#71717a' }}>
                We'll set your calorie target automatically based on your TDEE.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {([['lose', '🔥 Lose fat'], ['maintain', '⚖️ Maintain'], ['gain', '💪 Build']] as const).map(([t, l]) => (
                <button key={t} onClick={() => setGoalType(t)}
                  className="py-3 rounded-xl text-xs font-semibold border transition-all"
                  style={goalType === t
                    ? { background: 'linear-gradient(135deg,rgba(168,85,247,0.85),rgba(0,212,255,0.75))', color: 'white', border: '1px solid rgba(168,85,247,0.45)' }
                    : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.4)' }}>
                  {l}
                </button>
              ))}
            </div>

            <OField label="Goal weight (kg) — optional" value={goalWeight} set={setGoalWeight} placeholder="e.g. 65" />

            {/* TDEE + suggestion preview */}
            <div className="rounded-2xl p-4 space-y-3"
              style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.22)' }}>
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-[10px]" style={{ color: '#71717a' }}>Daily burn (TDEE)</div>
                  <div className="text-lg font-extrabold text-white">{tdee} kcal</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px]" style={{ color: '#71717a' }}>Your goal target</div>
                  <div className="text-lg font-extrabold" style={{ color: '#a855f7' }}>{suggestedKcal} kcal/day</div>
                </div>
              </div>
              <div className="text-[10px] pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.07)', color: '#71717a' }}>
                {goalType === 'lose'
                  ? '500 kcal deficit → ~0.5 kg/week fat loss'
                  : goalType === 'gain'
                  ? '300 kcal surplus → lean muscle build'
                  : 'Matches TDEE — weight stays stable'}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3 w-full max-w-sm mt-8">
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)}
            className="flex items-center gap-1 px-5 py-3.5 rounded-2xl text-sm font-semibold transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <ChevronLeft size={16} /> Back
          </button>
        )}
        <button
          disabled={!canNext}
          onClick={step < 2 ? () => setStep(s => s + 1) : finish}
          className="flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-2xl text-sm font-bold transition-all disabled:opacity-40"
          style={{
            background: 'linear-gradient(135deg,rgba(168,85,247,0.9),rgba(0,212,255,0.8))',
            color: 'white',
            border: '1px solid rgba(168,85,247,0.4)',
            boxShadow: '0 4px 20px rgba(168,85,247,0.3)',
          }}>
          {step < 2 ? <>Continue <ChevronRight size={16} /></> : 'Get started 🚀'}
        </button>
      </div>
    </div>
  )
}

function OField({ label, value, set, placeholder }: {
  label: string; value: string; set: (v: string) => void; placeholder?: string
}) {
  return (
    <div>
      <div className="label mb-1">{label}</div>
      <input
        className="input"
        type="number"
        inputMode="decimal"
        placeholder={placeholder}
        value={value}
        onChange={e => set(e.target.value)}
      />
    </div>
  )
}
