import { EXERCISES, minutesToBurn } from '../lib/exercises'

interface Props {
  kcal: number
  weightKg: number
  limit?: number
}
export default function ExerciseList({ kcal, weightKg, limit = 4 }: Props) {
  const items = EXERCISES.slice(0, limit)
  return (
    <div className="space-y-2">
      {items.map(ex => {
        const min = minutesToBurn(kcal, ex.met, weightKg)
        return (
          <div key={ex.id} className="flex items-center gap-3 bg-card2 border border-line rounded-xl p-3">
            <div className="w-10 h-10 rounded-xl bg-[rgba(0,212,255,0.1)] border border-[#1d3a5f] grid place-items-center text-xl">
              {ex.emoji}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm">{ex.name}</div>
              <div className="text-xs text-muted">{ex.meta} · {ex.met} MET</div>
            </div>
            <div className="text-accent font-extrabold">
              {min}<span className="text-muted text-xs ml-0.5 font-medium">min</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
