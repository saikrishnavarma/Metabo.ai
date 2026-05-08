import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, Sparkles, Key, Check, Plus, X } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, logFood, ensureProfile, type MealType } from '../lib/db'
import { sendMessage, type ChatMessage, type DetectedFood } from '../lib/aiChat'

interface DisplayMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  foods?: DetectedFood[]
  question?: string | null
  logged?: boolean
}

function currentMealType(): MealType {
  const h = new Date().getHours()
  if (h < 11) return 'breakfast'
  if (h < 15) return 'lunch'
  if (h < 21) return 'dinner'
  return 'snack'
}

export default function AIChatPage() {
  const nav     = useNavigate()
  const profile = useLiveQuery(() => db.profile.get('me'))
  const apiKey  = profile?.anthropicApiKey ?? ''

  const [messages, setMessages]   = useState<DisplayMessage[]>([
    {
      id: 'intro', role: 'assistant',
      text: "Hey! Tell me what you ate and I'll log it instantly. Try: \"I had 2 idlis and sambar for breakfast\" or ask me anything about nutrition. 🥗",
    }
  ])
  const [input, setInput]     = useState('')
  const [busy, setBusy]       = useState(false)
  const [keyInput, setKeyInput] = useState('')
  const [savingKey, setSavingKey] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const history   = useRef<ChatMessage[]>([])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function saveApiKey() {
    if (!keyInput.trim()) return
    setSavingKey(true)
    const p = await ensureProfile()
    await db.profile.put({ ...p, anthropicApiKey: keyInput.trim() })
    setSavingKey(false)
    setKeyInput('')
  }

  async function send() {
    const text = input.trim()
    if (!text || busy || !apiKey) return
    setInput('')
    setBusy(true)

    const userMsg: DisplayMessage = { id: Date.now().toString(), role: 'user', text }
    setMessages(prev => [...prev, userMsg])
    history.current.push({ role: 'user', content: text })

    try {
      const res = await sendMessage(history.current, apiKey)
      history.current.push({ role: 'assistant', content: res.message })
      const aiMsg: DisplayMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: res.message,
        foods: res.foods.length > 0 ? res.foods : undefined,
        question: res.question,
      }
      setMessages(prev => [...prev, aiMsg])
    } catch (e: any) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'assistant',
        text: `Error: ${e?.message ?? 'Something went wrong. Check your API key.'}`,
      }])
    } finally {
      setBusy(false)
    }
  }

  async function logFoods(msgId: string, foods: DetectedFood[]) {
    try {
      for (const f of foods) {
        const portionG = f.portionG > 0 ? f.portionG : 100
        const scale = 100 / portionG
        const foodId = await db.foods.add({
          source: 'ai',
          name: f.name,
          kcalPer100g:    f.kcal    * scale,
          proteinPer100g: f.protein * scale,
          carbsPer100g:   f.carbs   * scale,
          fatPer100g:     f.fat     * scale,
          defaultPortionG: portionG,
          createdAt: Date.now(),
        })
        await logFood(foodId as number, portionG, f.mealType)
      }
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, logged: true } : m))
      const totalKcal = foods.reduce((s, f) => s + f.kcal, 0)
      setMessages(prev => [...prev, {
        id: Date.now().toString(), role: 'assistant',
        text: `✅ Logged ${foods.length} item${foods.length > 1 ? 's' : ''} — ${Math.round(totalKcal)} kcal added to today's log.`,
      }])
    } catch (e: any) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(), role: 'assistant',
        text: `❌ Failed to log: ${e?.message ?? 'Unknown error'}`,
      }])
    }
  }

  if (!apiKey) {
    return (
      <div className="space-y-4 pt-2">
        <section className="card space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#a78bfa,#00d4ff)' }}>
              <Sparkles size={22} className="text-slate-900" />
            </div>
            <div>
              <h2 className="font-bold text-white">AI Nutrition Companion</h2>
              <p className="text-xs" style={{ color: '#71717a' }}>Powered by Claude AI</p>
            </div>
          </div>
          <p className="text-sm" style={{ color: '#71717a' }}>
            Just say what you ate — the AI logs it instantly. Understands Indian food, portions, restaurant vs homemade, and gives smart coaching.
          </p>
          <div className="rounded-2xl p-4 space-y-2" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <p className="text-xs font-semibold text-white">Examples:</p>
            {[
              '"I had 2 dosas and sambar for breakfast"',
              '"Chicken biryani for lunch, restaurant plate"',
              '"What should I eat to hit my protein goal?"',
            ].map(ex => (
              <p key={ex} className="text-xs" style={{ color: '#71717a' }}>• {ex}</p>
            ))}
          </div>
          <div>
            <p className="text-xs font-semibold mb-2 text-white flex items-center gap-1"><Key size={12}/> Enter your Anthropic API key</p>
            <p className="text-xs mb-3" style={{ color: '#71717a' }}>
              Get one free at <span style={{ color: '#00d4ff' }}>console.anthropic.com</span>. Stored locally, never shared.
            </p>
            <div className="flex gap-2">
              <input
                className="input flex-1 text-xs"
                placeholder="sk-ant-..."
                value={keyInput}
                onChange={e => setKeyInput(e.target.value)}
                type="password"
              />
              <button
                onClick={saveApiKey}
                disabled={!keyInput || savingKey}
                className="px-4 rounded-xl font-semibold text-sm text-white shrink-0 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,rgba(168,85,247,0.82),rgba(0,212,255,0.7))', border: '1px solid rgba(168,85,247,0.4)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)' }}
              >
                {savingKey ? '…' : 'Save'}
              </button>
            </div>
            <p className="text-xs mt-2" style={{ color: '#71717a' }}>
              Or set it later in <button onClick={() => nav('/profile')} className="underline" style={{ color: '#00d4ff' }}>Profile → AI Settings</button>
            </p>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-2">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] space-y-2 ${msg.role === 'user' ? '' : ''}`}>
              {/* Bubble */}
              <div
                className="px-4 py-3 rounded-2xl text-sm leading-relaxed"
                style={msg.role === 'user'
                  ? { background: 'linear-gradient(135deg,rgba(168,85,247,0.8),rgba(0,212,255,0.7))', color: 'white', borderBottomRightRadius: 4, border: '1px solid rgba(168,85,247,0.4)', backdropFilter: 'blur(8px)' }
                  : { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#e5edff', borderBottomLeftRadius: 4 }}
              >
                {msg.text}
              </div>

              {/* Food confirm cards */}
              {msg.foods && msg.foods.length > 0 && !msg.logged && (
                <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(168,85,247,0.3)', background: 'rgba(168,85,247,0.05)' }}>
                  <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(168,85,247,0.15)' }}>
                    <span className="text-xs font-semibold" style={{ color: '#a855f7' }}>Detected foods</span>
                    <span className="text-xs" style={{ color: '#71717a' }}>
                      {Math.round(msg.foods.reduce((s, f) => s + f.kcal, 0))} kcal total
                    </span>
                  </div>
                  {msg.foods.map((f, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2" style={{ borderBottom: i < msg.foods!.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                      <div>
                        <div className="text-sm font-semibold text-white">{f.name}</div>
                        <div className="text-xs" style={{ color: '#71717a' }}>{f.portionG}g · P{Math.round(f.protein)}g C{Math.round(f.carbs)}g F{Math.round(f.fat)}g</div>
                      </div>
                      <div className="font-bold text-sm" style={{ color: '#a855f7' }}>{Math.round(f.kcal)} kcal</div>
                    </div>
                  ))}
                  <div className="flex gap-2 p-3 pt-2">
                    <button
                      onClick={() => logFoods(msg.id, msg.foods!)}
                      className="flex-1 py-2 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-1"
                      style={{ background: 'linear-gradient(135deg,rgba(168,85,247,0.82),rgba(0,212,255,0.7))', border: '1px solid rgba(168,85,247,0.45)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}
                    >
                      <Plus size={14}/> Log all
                    </button>
                    <button
                      onClick={() => setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, foods: [] } : m))}
                      className="px-3 py-2 rounded-xl text-sm"
                      style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)' }}
                    >
                      <X size={14}/>
                    </button>
                  </div>
                </div>
              )}
              {msg.logged && (
                <div className="flex items-center gap-1 text-xs px-1" style={{ color: '#a855f7' }}>
                  <Check size={12}/> Logged
                </div>
              )}

              {/* Clarifying question */}
              {msg.question && (
                <div className="text-xs px-1" style={{ color: '#71717a' }}>💬 {msg.question}</div>
              )}
            </div>
          </div>
        ))}

        {busy && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <div className="flex gap-1 items-center">
                {[0, 1, 2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#a855f7', animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="pt-2 pb-1">
        <div className="flex gap-2 items-end">
          <textarea
            rows={1}
            className="flex-1 rounded-2xl px-4 py-3 text-sm resize-none outline-none text-white placeholder:text-slate-500"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', maxHeight: 120 }}
            placeholder="I had dosa and sambar for breakfast…"
            value={input}
            onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || busy}
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,rgba(168,85,247,0.85),rgba(0,212,255,0.72))', border: '1px solid rgba(168,85,247,0.45)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)' }}
          >
            <Send size={18} className="text-slate-900" />
          </button>
        </div>
      </div>
    </div>
  )
}
