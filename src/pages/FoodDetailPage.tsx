import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Plus, Minus, Check } from 'lucide-react'
import { db, logFood, type MealType } from '../lib/db'
import MacroPills from '../components/MacroPills'
import ExerciseList from '../components/ExerciseList'
import { useProfile } from '../hooks/useProfile'
import { macrosForPortion } from '../lib/format'

const MEALS: { id: MealType; label: string }[] = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch',     label: 'Lunch'     },
  { id: 'dinner',    label: 'Dinner'    },
  { id: 'snack',     label: 'Snack'     }
]

export default function FoodDetailPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const foodId = Number(id)
  const food = useLiveQuery(() => db.foods.get(foodId), [foodId])
  const { profile } = useProfile()
  const [portionG, setPortionG] = useState<number | null>(null)
  const [meal, setMeal] = useState<MealType>(currentMeal())
  const [logged, setLogged] = useState(false)

  if (!food) return <div className="text-muted text-sm py-12 text-center">Loading…</div>

  const portion = portionG ?? food.defaultPortionG
  const m = macrosForPortion(food, portion)

  async function save() {
    if (!food || food.id == null) return
    await logFood(food.id, portion, meal)
    setLogged(true)
    setTimeout(() => nav('/history'), 600)
  }

  return (
    <div className="space-y-4 pt-2">
      <button onClick={() => nav(-1)} className="flex items-center gap-1 text-muted text-sm">
        <ArrowLeft size={16}/> Back
      </button>

      <section className="card">
        <div className="flex items-center gap-3">
          {food.imageUrl
            ? <img src={food.imageUrl} alt="" className="w-16 h-16 rounded-xl object-cover bg-bg" />
            : <div className="w-16 h-16 rounded-xl grid place-items-center text-2xl"
                   style={{ background: 'linear-gradient(135deg,#a855f7,#00d4ff)' }}>🍽️</div>}
          <div className="flex-1 min-w-0">
            <h2 className="m-0 text-lg font-bold truncate">{food.name}</h2>
            <div className="text-xs text-muted truncate">{food.brand || '—'} · {Math.round(food.kcalPer100g)} kcal/100g</div>
          </div>
        </div>

        {/* Portion */}
        <div className="mt-4">
          <div className="label">Portion</div>
          <div className="flex items-center gap-2 mt-2">
            <button className="btn-ghost px-3" onClick={() => setPortionG(Math.max(5, portion - 10))}><Minus size={16}/></button>
            <input
              type="number"
              className="input text-center"
              value={portion}
              onChange={(e) => setPortionG(Number(e.target.value) || 0)}
              min={1}
            />
            <span className="text-sm text-muted">g</span>
            <button className="btn-ghost px-3" onClick={() => setPortionG(portion + 10)}><Plus size={16}/></button>
          </div>
        </div>

        {/* Calories big */}
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-4xl font-extrabold"
                style={{ background: 'linear-gradient(135deg,#a855f7,#00d4ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {Math.round(m.kcal)}
          </span>
          <span className="text-muted text-sm">kcal</span>
        </div>

        <div className="mt-3"><MacroPills protein={m.protein} carbs={m.carbs} fat={m.fat} /></div>

        {/* Meal selector */}
        <div className="mt-4">
          <div className="label">Meal</div>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {MEALS.map(opt => (
              <button
                key={opt.id}
                onClick={() => setMeal(opt.id)}
                className={
                  'rounded-lg py-2 text-xs border ' +
                  (meal === opt.id
                    ? 'bg-accent text-slate-900 border-accent font-semibold'
                    : 'bg-card2 border-line text-muted')
                }
              >{opt.label}</button>
            ))}
          </div>
        </div>

        <button className="btn-primary w-full mt-4" onClick={save} disabled={logged}>
          {logged ? <><Check size={18}/> Logged</> : <><Plus size={18}/> Log it</>}
        </button>
      </section>

      <section className="card">
        <h3 className="label">Burn it off 🔥</h3>
        <div className="mt-3">
          <ExerciseList kcal={m.kcal} weightKg={profile?.weightKg ?? 70} />
        </div>
        <p className="mt-3 text-[11px] text-muted">
          Estimates use your weight ({profile?.weightKg ?? 70} kg). Update in Profile.
        </p>
      </section>
    </div>
  )
}

function currentMeal(): MealType {
  const h = new Date().getHours()
  if (h < 11) return 'breakfast'
  if (h < 15) return 'lunch'
  if (h < 21) return 'dinner'
  return 'snack'
}
