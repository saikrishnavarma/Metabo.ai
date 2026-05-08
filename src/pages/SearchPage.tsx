import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Loader2 } from 'lucide-react'
import { searchFoods, offToFood, type OFFProduct } from '../lib/api/openfoodfacts'
import { searchUSDA, usdaToFood, type USDAFood } from '../lib/api/usda'
import { upsertFoodByExternalId } from '../lib/db'

type ResultItem =
  | { src: 'off';  data: OFFProduct }
  | { src: 'usda'; data: USDAFood }

export default function SearchPage() {
  const nav = useNavigate()
  const [q, setQ]           = useState('')
  const [results, setResults] = useState<ResultItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!q.trim()) { setResults([]); setError(null); return }
    const handle = setTimeout(async () => {
      abortRef.current?.abort()
      const ac = new AbortController()
      abortRef.current = ac
      setLoading(true)
      setError(null)
      try {
        const [offResult, usdaResult] = await Promise.allSettled([
          searchFoods(q, ac.signal),
          searchUSDA(q, ac.signal),
        ])

        // Ignore aborted requests entirely
        const isAbort = (r: PromiseSettledResult<any>) =>
          r.status === 'rejected' && r.reason?.name === 'AbortError'
        if (isAbort(offResult) && isAbort(usdaResult)) return

        const items: ResultItem[] = []
        const usda = usdaResult.status === 'fulfilled' ? usdaResult.value : []
        const off  = offResult.status  === 'fulfilled' ? offResult.value  : []

        usda.slice(0, 10).forEach(d => items.push({ src: 'usda', data: d }))
        off.slice(0, 10).forEach(d  => items.push({ src: 'off',  data: d }))

        setResults(items)

        // Only show a connection error when both genuinely failed (not abort, not empty)
        const bothFailed = offResult.status === 'rejected' && usdaResult.status === 'rejected'
          && !isAbort(offResult) && !isAbort(usdaResult)
        if (bothFailed) setError('Search failed. Check your connection.')

      } catch (e: any) {
        if (e?.name !== 'AbortError') setError(e?.message ?? 'Search failed')
      } finally {
        setLoading(false)
      }
    }, 350)
    return () => clearTimeout(handle)
  }, [q])

  async function pick(item: ResultItem) {
    const food = item.src === 'usda' ? usdaToFood(item.data) : offToFood(item.data)
    const id = await upsertFoodByExternalId(food)
    nav(`/food/${id}`)
  }

  function getLabel(item: ResultItem): string {
    if (item.src === 'usda') return item.data.dataType === 'Branded' ? item.data.brandOwner ?? 'USDA' : 'USDA'
    return item.data.brands?.split(',')[0]?.trim() || 'OpenFoodFacts'
  }

  function getKcal(item: ResultItem): number {
    if (item.src === 'usda') {
      return Math.round(item.data.foodNutrients.find(n => n.nutrientId === 1008)?.value ?? 0)
    }
    return Math.round(item.data.nutriments?.['energy-kcal_100g'] ?? 0)
  }

  function getName(item: ResultItem): string {
    if (item.src === 'usda') {
      const s = item.data.description.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
      return s.length > 50 ? s.slice(0, 50) + '…' : s
    }
    return item.data.product_name_en || item.data.product_name || 'Unknown'
  }

  function getImage(item: ResultItem): string | undefined {
    if (item.src === 'off') return item.data.image_front_small_url
    return undefined
  }

  function getBadge(item: ResultItem) {
    if (item.src === 'usda') {
      const t = item.data.dataType
      if (t === 'Foundation' || t === 'SR Legacy') return { label: 'USDA', color: '#22c55e' }
      if (t === 'Survey (FNDDS)')                  return { label: 'USDA', color: '#22c55e' }
      return { label: 'USDA', color: '#22c55e' }
    }
    return { label: 'OFF', color: '#06b6d4' }
  }

  return (
    <div className="space-y-3 pt-2">
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          autoFocus
          className="input pl-10"
          placeholder="Search foods (e.g. chicken breast, rice, dosa)"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-muted animate-spin" size={18} />}
      </div>

      {error && <div className="text-sm text-red-300">{error}</div>}

      {!q && (
        <div className="text-center text-muted text-sm py-12 space-y-1">
          <div>Search across USDA + OpenFoodFacts</div>
          <div className="text-xs" style={{ color: '#71717a' }}>300,000+ foods — raw ingredients, packaged & restaurant</div>
        </div>
      )}

      {results.length > 0 && (
        <ul className="space-y-2">
          {results.map((item, i) => {
            const badge = getBadge(item)
            const img   = getImage(item)
            return (
              <li key={i}>
                <button
                  onClick={() => pick(item)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
                >
                  {img
                    ? <img src={img} alt="" className="w-12 h-12 rounded-lg object-cover" style={{ background: '#050507' }} />
                    : <div className="w-12 h-12 rounded-lg grid place-items-center text-xl shrink-0"
                        style={{ background: 'rgba(255,255,255,0.06)' }}>🥗</div>}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate text-white">{getName(item)}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                        style={{ background: badge.color + '22', color: badge.color, border: `1px solid ${badge.color}44` }}>
                        {badge.label}
                      </span>
                      <span className="text-xs truncate" style={{ color: '#71717a' }}>{getLabel(item)}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-sm text-white">{getKcal(item)}</div>
                    <div className="text-[10px]" style={{ color: '#71717a' }}>kcal/100g</div>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {!loading && q && results.length === 0 && !error && (
        <div className="text-center text-muted text-sm py-8">No matches. Try a simpler term.</div>
      )}
    </div>
  )
}
