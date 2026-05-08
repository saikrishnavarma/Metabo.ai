import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScanBarcode, Search, PenLine, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import BarcodeScanner from '../components/BarcodeScanner'
import { lookupBarcode, offToFood } from '../lib/api/openfoodfacts'
import { upsertFoodByExternalId, db, logFood } from '../lib/db'
import { INDIAN_FOODS, INDIAN_FOOD_CATEGORIES } from '../lib/indianFoods'
import { useProfile } from '../hooks/useProfile'

export default function ScanPage() {
  const nav = useNavigate()
  const { profile } = useProfile()
  const [scannerOpen, setScannerOpen] = useState(false)
  const [busy,  setBusy]  = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showIndian, setShowIndian] = useState(true)
  const [category, setCategory] = useState('All')
  const [loggedId, setLoggedId] = useState<string | null>(null)

  async function handleCode(code: string) {
    setScannerOpen(false); setBusy(`Looking up ${code}…`); setError(null)
    try {
      const product = await lookupBarcode(code)
      if (!product) { setError(`No product found for barcode ${code}.`); return }
      const id = await upsertFoodByExternalId(offToFood(product))
      nav(`/food/${id}`)
    } catch (e: any) { setError(e?.message ?? 'Lookup failed') }
    finally { setBusy(null) }
  }

  async function quickLogIndian(idx: number) {
    const food = INDIAN_FOODS[idx]
    const id = await db.foods.add({ ...food, createdAt: Date.now() }) as number
    await logFood(id, food.defaultPortionG, guessMeal())
    setLoggedId(`${idx}-${Date.now()}`)
    setTimeout(() => setLoggedId(null), 1500)
  }

  function guessMeal() {
    const h = new Date().getHours()
    if (h < 11) return 'breakfast' as const
    if (h < 15) return 'lunch'    as const
    if (h < 21) return 'dinner'   as const
    return 'snack' as const
  }

  const filtered = category === 'All'
    ? INDIAN_FOODS
    : INDIAN_FOODS.filter(f => f.brand === category)

  return (
    <div className="space-y-4 pt-2">
      {/* ── Add methods ── */}
      <section className="card space-y-3">
        <div>
          <h2 className="text-base font-semibold text-white">Add food</h2>
          <p className="text-xs mt-1" style={{ color: '#71717a' }}>Scan, search, or enter calories manually.</p>
        </div>

        <button className="w-full flex items-center gap-4 p-4 rounded-2xl text-left active:scale-[0.98] transition-all"
          style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.25)' }}
          onClick={() => setScannerOpen(true)}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg,#a855f7,#00d4ff)' }}>
            <ScanBarcode size={22} className="text-slate-900" />
          </div>
          <div>
            <div className="font-semibold text-white text-sm">Scan barcode</div>
            <div className="text-xs mt-0.5" style={{ color: '#71717a' }}>Instant nutrition from packaged food</div>
          </div>
        </button>

        <button className="w-full flex items-center gap-4 p-4 rounded-2xl text-left active:scale-[0.98] transition-all"
          style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.2)' }}
          onClick={() => nav('/search')}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(0,212,255,0.15)', border: '1px solid rgba(0,212,255,0.3)' }}>
            <Search size={20} style={{ color: '#00d4ff' }} />
          </div>
          <div>
            <div className="font-semibold text-white text-sm">Search foods</div>
            <div className="text-xs mt-0.5" style={{ color: '#71717a' }}>OpenFoodFacts — millions of products</div>
          </div>
        </button>

        <button className="w-full flex items-center gap-4 p-4 rounded-2xl text-left active:scale-[0.98] transition-all"
          style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.2)' }}
          onClick={() => nav('/add-manual')}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)' }}>
            <PenLine size={20} style={{ color: '#a78bfa' }} />
          </div>
          <div>
            <div className="font-semibold text-white text-sm">Add manually</div>
            <div className="text-xs mt-0.5" style={{ color: '#71717a' }}>Enter food name, calories &amp; macros</div>
          </div>
        </button>

        {busy && <div className="flex items-center gap-2 text-sm" style={{ color: '#71717a' }}><Loader2 className="animate-spin" size={16}/> {busy}</div>}
        {error && <div className="text-sm" style={{ color: '#f87171' }}>{error}</div>}
      </section>

      {/* ── Indian Food Quick-Add ── */}
      <section className="card">
        <button className="w-full flex items-center justify-between" onClick={() => setShowIndian(v => !v)}>
          <div className="flex items-center gap-2">
            <span className="text-base">🇮🇳</span>
            <div className="text-left">
              <div className="text-sm font-bold text-white">Indian Food Quick-Add</div>
              <div className="text-xs" style={{ color: '#71717a' }}>One-tap logging for {INDIAN_FOODS.length}+ Indian foods</div>
            </div>
          </div>
          {showIndian ? <ChevronUp size={18} style={{ color: '#71717a' }}/> : <ChevronDown size={18} style={{ color: '#71717a' }}/>}
        </button>

        {showIndian && (
          <div className="mt-4 space-y-3">
            {/* Category filter */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {INDIAN_FOOD_CATEGORIES.map(c => (
                <button key={c} onClick={() => setCategory(c)}
                  className="shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all"
                  style={category === c
                    ? { background: 'linear-gradient(135deg,rgba(168,85,247,0.8),rgba(0,212,255,0.65))', color: 'white', border: '1px solid rgba(168,85,247,0.4)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)' }
                    : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.45)' }}>
                  {c}
                </button>
              ))}
            </div>

            {/* Food grid */}
            <div className="space-y-1.5">
              {filtered.map((food, i) => {
                const idx = INDIAN_FOODS.indexOf(food)
                const kcal = Math.round(food.kcalPer100g * food.defaultPortionG / 100)
                const isLogged = loggedId?.startsWith(`${idx}-`)
                return (
                  <button key={idx} onClick={() => quickLogIndian(idx)}
                    className="w-full flex items-center justify-between p-3 rounded-xl transition-all active:scale-[0.98]"
                    style={isLogged
                      ? { background: 'rgba(168,85,247,0.18)', border: '1px solid rgba(168,85,247,0.45)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)' }
                      : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
                    <div className="text-left min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{food.name}</div>
                      <div className="text-xs mt-0.5" style={{ color: '#71717a' }}>
                        {food.defaultPortionG}g · P{Math.round(food.proteinPer100g * food.defaultPortionG / 100)}g C{Math.round(food.carbsPer100g * food.defaultPortionG / 100)}g
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      {isLogged
                        ? <span className="text-sm font-bold" style={{ color: '#a855f7' }}>✓ Logged</span>
                        : <>
                            <div className="font-bold text-sm text-white">{kcal} kcal</div>
                            <div className="text-[10px]" style={{ color: '#71717a' }}>{food.brand}</div>
                          </>}
                    </div>
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-center" style={{ color: '#71717a' }}>Tap once to log at default portion · Adjust in Today's log</p>
          </div>
        )}
      </section>

      {scannerOpen && <BarcodeScanner onCode={handleCode} onClose={() => setScannerOpen(false)} />}
    </div>
  )
}
