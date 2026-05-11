import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Check } from 'lucide-react'
import { db, logFood, type MealType } from '../lib/db'
import { useDateContext } from '../context/DateContext'

const MEALS: { id: MealType; label: string; emoji: string }[] = [
  { id: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { id: 'lunch',     label: 'Lunch',     emoji: '☀️'  },
  { id: 'dinner',    label: 'Dinner',    emoji: '🌙' },
  { id: 'snack',     label: 'Snack',     emoji: '🍎' },
]

function currentMeal(): MealType {
  const h = new Date().getHours()
  if (h < 11) return 'breakfast'
  if (h < 15) return 'lunch'
  if (h < 21) return 'dinner'
  return 'snack'
}

export default function ManualEntryPage() {
  const nav = useNavigate()
  const { selectedDate } = useDateContext()
  const [name, setName]       = useState('')
  const [kcal, setKcal]       = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs]     = useState('')
  const [fat, setFat]         = useState('')
  const [portion, setPortion] = useState('100')
  const [meal, setMeal]       = useState<MealType>(currentMeal())
  const [logged, setLogged]   = useState(false)
  const [error, setError]     = useState('')

  async function save() {
    if (!name.trim()) { setError('Please enter a food name'); return }
    if (!kcal || Number(kcal) <= 0) { setError('Please enter calories'); return }
    setError('')

    const portionG = Number(portion) || 100
    const kcalVal  = Number(kcal) || 0

    // Store per 100g so the existing food model works
    const scale = 100 / portionG
    const foodId = await db.foods.add({
      source: 'manual',
      name: name.trim(),
      kcalPer100g:    kcalVal   * scale,
      proteinPer100g: (Number(protein) || 0) * scale,
      carbsPer100g:   (Number(carbs)   || 0) * scale,
      fatPer100g:     (Number(fat)     || 0) * scale,
      defaultPortionG: portionG,
      createdAt: Date.now(),
    })

    await logFood(foodId as number, portionG, meal, selectedDate)
    setLogged(true)
    setTimeout(() => nav('/'), 600)
  }

  return (
    <div className="space-y-4 pt-2">
      <button onClick={() => nav(-1)} className="flex items-center gap-1 text-muted text-sm">
        <ArrowLeft size={16} /> Back
      </button>

      <section className="card space-y-4">
        <h2 className="text-base font-bold">Add food manually</h2>

        {/* Name */}
        <div>
          <div className="label mb-1">Food name *</div>
          <input
            className="input"
            placeholder="e.g. Homemade pasta, Protein shake…"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
        </div>

        {/* Calories + portion */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="label mb-1">Calories (kcal) *</div>
            <input
              className="input"
              type="number"
              inputMode="numeric"
              placeholder="e.g. 350"
              value={kcal}
              onChange={e => setKcal(e.target.value)}
            />
          </div>
          <div>
            <div className="label mb-1">Portion (g)</div>
            <input
              className="input"
              type="number"
              inputMode="numeric"
              placeholder="100"
              value={portion}
              onChange={e => setPortion(e.target.value)}
            />
          </div>
        </div>

        {/* Optional macros */}
        <div>
          <div className="label mb-2">Macros (optional)</div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Protein g', val: protein, set: setProtein, color: '#00d4ff' },
              { label: 'Carbs g',   val: carbs,   set: setCarbs,   color: '#a78bfa' },
              { label: 'Fat g',     val: fat,      set: setFat,     color: '#fb923c' },
            ].map(({ label, val, set, color }) => (
              <div key={label}>
                <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color }}>{label}</div>
                <input
                  className="input text-center"
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={val}
                  onChange={e => set(e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Meal */}
        <div>
          <div className="label mb-2">Meal</div>
          <div className="grid grid-cols-4 gap-2">
            {MEALS.map(m => (
              <button
                key={m.id}
                onClick={() => setMeal(m.id)}
                className="rounded-xl py-2.5 text-xs border flex flex-col items-center gap-1 transition-all"
                style={meal === m.id
                  ? { background: 'linear-gradient(135deg,rgba(168,85,247,0.82),rgba(0,212,255,0.7))', color: 'white', border: '1px solid rgba(168,85,247,0.45)', fontWeight: 700, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)' }
                  : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.4)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}
              >
                <span>{m.emoji}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="text-sm px-3 py-2 rounded-xl" style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}>
            {error}
          </div>
        )}

        {/* Preview */}
        {kcal && Number(kcal) > 0 && (
          <div className="rounded-2xl p-3 flex items-center justify-between"
            style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)' }}>
            <span className="text-sm text-muted">{name || 'Food'} · {portion || 100}g</span>
            <span className="font-extrabold text-lg" style={{ color: '#a855f7' }}>{kcal} kcal</span>
          </div>
        )}

        <button
          className="w-full py-3.5 rounded-2xl text-sm font-bold text-slate-900 transition-all"
          style={{ background: logged ? 'rgba(168,85,247,0.6)' : 'linear-gradient(135deg,rgba(168,85,247,0.82),rgba(0,212,255,0.7))', border: '1px solid rgba(168,85,247,0.4)', boxShadow: logged ? 'inset 0 1px 0 rgba(255,255,255,0.15)' : '0 4px 20px rgba(168,85,247,0.3), inset 0 1px 0 rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', color: 'white' }}
          onClick={save}
          disabled={logged}
        >
          {logged ? <span className="flex items-center justify-center gap-2"><Check size={16}/> Logged!</span>
                  : <span className="flex items-center justify-center gap-2"><Plus size={16}/> Log this food</span>}
        </button>
      </section>
    </div>
  )
}
