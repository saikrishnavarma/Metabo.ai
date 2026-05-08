interface Props {
  protein: number
  carbs: number
  fat: number
}
export default function MacroPills({ protein, carbs, fat }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <Pill label="Protein" value={protein} unit="g" color="#00d4ff" />
      <Pill label="Carbs"   value={carbs}   unit="g" color="#fbbf24" />
      <Pill label="Fat"     value={fat}     unit="g" color="#f472b6" />
    </div>
  )
}

function Pill({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div className="bg-card2 border border-line rounded-xl p-3 text-center">
      <div className="label">{label}</div>
      <div className="font-bold text-base mt-0.5">{value.toFixed(1)}<span className="text-muted text-xs ml-0.5">{unit}</span></div>
      <div className="h-1 mt-2 rounded bg-[#1a2748] overflow-hidden">
        <div style={{ width: `${Math.min(100, value * 2)}%`, background: color, height: '100%' }} />
      </div>
    </div>
  )
}
