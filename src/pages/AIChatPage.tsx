import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Send, Sparkles, Key, Undo2, Mic, MicOff } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, logFood, logExercise, ensureProfile, todayKey, type ChatLogEntry } from '../lib/db'
import { sendMessage, type ChatMessage, type DetectedFood, type DetectedExercise } from '../lib/aiChat'
import { upsertFoodByExternalId } from '../lib/db'
import { useDateContext } from '../context/DateContext'

interface DisplayMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  foods?: DetectedFood[]
  exercise?: DetectedExercise[]
  question?: string | null
  logged?: boolean
}

interface UndoState {
  foodLogIds: number[]
  exerciseLogIds: number[]
  count: number
  kcal: number
  timer: ReturnType<typeof setTimeout>
}

const QUICK_CHIPS = [
  { label: 'Rice 🍚',     text: 'rice' },
  { label: 'Chai ☕',     text: 'masala chai' },
  { label: 'Roti 🫓',    text: 'roti' },
  { label: 'Egg 🥚',     text: '2 boiled eggs' },
  { label: 'Biryani 🍛', text: 'chicken biryani' },
  { label: 'Dal 🥣',     text: 'dal tadka' },
  { label: 'Walk 🚶',    text: '30 min walk' },
  { label: 'Gym 🏋️',    text: '1 hour gym' },
  { label: 'Run 🏃',     text: '30 min run' },
  { label: 'Idli 🍽️',   text: '2 idli and sambar' },
]

const INTRO_MSG: DisplayMessage = {
  id: 'intro',
  role: 'assistant',
  text: "Hey! Tell me what you ate or what exercise you did — I'll log it instantly. Try \"biryani for lunch\" or \"30 min walk\" or both at once. 🥗💪",
}

function entryToDisplay(e: ChatLogEntry): DisplayMessage {
  return {
    id: e.msgId,
    role: e.role,
    text: e.text,
    foods: e.foods ? JSON.parse(e.foods) : undefined,
    question: e.question ?? undefined,
    logged: e.logged,
  }
}

declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

export default function AIChatPage() {
  const nav            = useNavigate()
  const [searchParams] = useSearchParams()
  const profile          = useLiveQuery(() => db.profile.get('me'))
  const apiKey           = profile?.anthropicApiKey ?? ''
  const { selectedDate } = useDateContext()

  const [messages, setMessages]     = useState<DisplayMessage[]>([INTRO_MSG])
  const [input, setInput]           = useState('')
  const [busy, setBusy]             = useState(false)
  const [keyInput, setKeyInput]     = useState('')
  const [savingKey, setSavingKey]   = useState(false)
  const [undoState, setUndoState]   = useState<UndoState | null>(null)
  const [listening, setListening]   = useState(false)
  const bottomRef   = useRef<HTMLDivElement>(null)
  const history     = useRef<ChatMessage[]>([])
  const autoSentRef = useRef(false)
  const recognitionRef = useRef<any>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load today's chat history
  useEffect(() => {
    db.chatLog.where('dateKey').equals(selectedDate).sortBy('createdAt').then(entries => {
      if (entries.length > 0) {
        setMessages(entries.map(entryToDisplay))
        history.current = entries.map(e => ({ role: e.role, content: e.text }))
      }
      const urlText = searchParams.get('text')
      if (urlText && !autoSentRef.current) {
        autoSentRef.current = true
        setInput(urlText)
      }
    })
  }, [])

  // Auto-send from URL param
  useEffect(() => {
    if (autoSentRef.current && input && apiKey && !busy) {
      autoSentRef.current = false
      sendText(input)
    }
  }, [input, apiKey])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => () => {
    if (undoState) clearTimeout(undoState.timer)
    recognitionRef.current?.stop()
  }, [])

  function toggleVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Voice input not supported on this device.'); return }

    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }

    const recognition = new SR()
    recognition.lang = 'en-IN'
    recognition.continuous = false
    recognition.interimResults = false
    recognitionRef.current = recognition

    recognition.onstart = () => setListening(true)
    recognition.onend   = () => setListening(false)
    recognition.onerror = () => setListening(false)
    recognition.onresult = (e: any) => {
      const spoken = e.results[0][0].transcript
      setInput(spoken)
      setTimeout(() => sendText(spoken), 300)
    }
    recognition.start()
  }

  async function saveApiKey() {
    if (!keyInput.trim()) return
    setSavingKey(true)
    const p = await ensureProfile()
    await db.profile.put({ ...p, anthropicApiKey: keyInput.trim() })
    setSavingKey(false)
    setKeyInput('')
  }

  async function saveMsgToDB(msg: DisplayMessage) {
    await db.chatLog.add({
      msgId: msg.id,
      dateKey: selectedDate,
      role: msg.role,
      text: msg.text,
      foods: msg.foods ? JSON.stringify(msg.foods) : undefined,
      question: msg.question,
      logged: msg.logged,
      createdAt: Date.now(),
    })
  }

  async function autoLog(msgId: string, foods: DetectedFood[], exercise: DetectedExercise[]) {
    const foodLogIds: number[] = []
    const exerciseLogIds: number[] = []
    let totalKcal = 0

    for (const f of foods) {
      const portionG = f.portionG > 0 ? f.portionG : 100
      const scale = 100 / portionG
      const foodId = await upsertFoodByExternalId({
        source: 'ai',
        externalId: `ai-${f.name.toLowerCase().replace(/\s+/g, '-')}`,
        name: f.name,
        kcalPer100g:    f.kcal    * scale,
        proteinPer100g: f.protein * scale,
        carbsPer100g:   f.carbs   * scale,
        fatPer100g:     f.fat     * scale,
        defaultPortionG: portionG,
      })
      const logId = await logFood(foodId, portionG, f.mealType, selectedDate)
      foodLogIds.push(logId as number)
      totalKcal += f.kcal
    }

    for (const ex of exercise) {
      const logId = await logExercise({
        exerciseId: `ai-${ex.name.toLowerCase().replace(/\s+/g, '-')}`,
        name: ex.name,
        emoji: ex.emoji,
        durationMin: ex.durationMin,
        kcalBurned: ex.kcalBurned,
      }, selectedDate)
      exerciseLogIds.push(logId as number)
    }

    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, logged: true } : m))
    await db.chatLog.where('msgId').equals(msgId).modify({ logged: true })

    const timer = setTimeout(() => setUndoState(null), 5000)
    setUndoState({ foodLogIds, exerciseLogIds, count: foods.length + exercise.length, kcal: Math.round(totalKcal), timer })
  }

  async function undoLog() {
    if (!undoState) return
    clearTimeout(undoState.timer)
    if (undoState.foodLogIds.length)     await db.log.bulkDelete(undoState.foodLogIds)
    if (undoState.exerciseLogIds.length) await db.exerciseLog.bulkDelete(undoState.exerciseLogIds)
    setUndoState(null)
  }

  async function sendText(text: string) {
    const trimmed = text.trim()
    if (!trimmed || busy || !apiKey) return
    setInput('')
    if (textareaRef.current) { textareaRef.current.style.height = 'auto' }
    setBusy(true)

    const userMsg: DisplayMessage = { id: Date.now().toString(), role: 'user', text: trimmed }
    setMessages(prev => prev.filter(m => m.id !== 'intro').concat(userMsg))
    history.current.push({ role: 'user', content: trimmed })
    await saveMsgToDB(userMsg)

    try {
      const res = await sendMessage(history.current, apiKey)
      history.current.push({ role: 'assistant', content: res.message })
      const aiMsg: DisplayMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: res.message,
        foods:    res.foods?.length    > 0 ? res.foods    : undefined,
        exercise: res.exercise?.length > 0 ? res.exercise : undefined,
        question: res.question,
      }
      setMessages(prev => [...prev, aiMsg])
      await saveMsgToDB(aiMsg)

      if ((res.foods?.length ?? 0) > 0 || (res.exercise?.length ?? 0) > 0) {
        await autoLog(aiMsg.id, res.foods ?? [], res.exercise ?? [])
      }
    } catch (e: any) {
      const errMsg: DisplayMessage = {
        id: (Date.now() + 1).toString(), role: 'assistant',
        text: `Error: ${e?.message ?? 'Something went wrong. Check your API key.'}`,
      }
      setMessages(prev => [...prev, errMsg])
      await saveMsgToDB(errMsg)
    } finally {
      setBusy(false)
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
            Say what you ate or what exercise you did — AI logs it instantly.
          </p>
          <div className="rounded-2xl p-4 space-y-2" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <p className="text-xs font-semibold text-white">Examples:</p>
            {['"I had biryani"', '"Tea and biscuits"', '"30 min walk and rice for lunch"', '"1 hour gym"'].map(ex => (
              <p key={ex} className="text-xs" style={{ color: '#71717a' }}>• {ex}</p>
            ))}
          </div>
          <div>
            <p className="text-xs font-semibold mb-2 text-white flex items-center gap-1"><Key size={12}/> Enter your Anthropic API key</p>
            <p className="text-xs mb-3" style={{ color: '#71717a' }}>
              Get one free at <span style={{ color: '#00d4ff' }}>console.anthropic.com</span>. Stored locally, never shared.
            </p>
            <div className="flex gap-2">
              <input className="input flex-1 text-xs" placeholder="sk-ant-..."
                value={keyInput} onChange={e => setKeyInput(e.target.value)} type="password" />
              <button onClick={saveApiKey} disabled={!keyInput || savingKey}
                className="px-4 rounded-xl font-semibold text-sm text-white shrink-0 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,rgba(168,85,247,0.82),rgba(0,212,255,0.7))', border: '1px solid rgba(168,85,247,0.4)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)' }}>
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
      {/* Undo toast */}
      {undoState && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl mb-2"
          style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.35)' }}>
          <span className="text-sm text-white font-semibold">
            ✅ Logged {undoState.count} item{undoState.count > 1 ? 's' : ''}
            {undoState.kcal > 0 ? ` — ${undoState.kcal} kcal` : ''}
          </span>
          <button onClick={undoLog}
            className="flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', color: '#a855f7' }}>
            <Undo2 size={12}/> Undo
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-2">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[85%] space-y-2">
              <div className="px-4 py-3 rounded-2xl text-sm leading-relaxed"
                style={msg.role === 'user'
                  ? { background: 'linear-gradient(135deg,rgba(168,85,247,0.8),rgba(0,212,255,0.7))', color: 'white', borderBottomRightRadius: 4, border: '1px solid rgba(168,85,247,0.4)', backdropFilter: 'blur(8px)' }
                  : { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#e5edff', borderBottomLeftRadius: 4 }}>
                {msg.text}
              </div>

              {/* Food card */}
              {msg.foods && msg.foods.length > 0 && (
                <div className="rounded-2xl overflow-hidden"
                  style={{ border: '1px solid rgba(168,85,247,0.3)', background: 'rgba(168,85,247,0.05)' }}>
                  <div className="px-3 py-2 flex items-center justify-between"
                    style={{ borderBottom: '1px solid rgba(168,85,247,0.15)' }}>
                    <span className="text-xs font-semibold" style={{ color: '#a855f7' }}>
                      {msg.logged ? '✅ Food logged' : '🍽️ Food detected'}
                    </span>
                    <span className="text-xs" style={{ color: '#71717a' }}>
                      {Math.round(msg.foods.reduce((s, f) => s + f.kcal, 0))} kcal
                    </span>
                  </div>
                  {msg.foods.map((f, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2"
                      style={{ borderBottom: i < msg.foods!.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                      <div>
                        <div className="text-sm font-semibold text-white">{f.name}</div>
                        <div className="text-xs" style={{ color: '#71717a' }}>
                          {f.portionG}g · P{Math.round(f.protein)}g C{Math.round(f.carbs)}g F{Math.round(f.fat)}g
                        </div>
                      </div>
                      <div className="font-bold text-sm" style={{ color: '#a855f7' }}>+{Math.round(f.kcal)} kcal</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Exercise card */}
              {msg.exercise && msg.exercise.length > 0 && (
                <div className="rounded-2xl overflow-hidden"
                  style={{ border: '1px solid rgba(0,212,255,0.3)', background: 'rgba(0,212,255,0.05)' }}>
                  <div className="px-3 py-2 flex items-center justify-between"
                    style={{ borderBottom: '1px solid rgba(0,212,255,0.15)' }}>
                    <span className="text-xs font-semibold" style={{ color: '#00d4ff' }}>
                      {msg.logged ? '✅ Exercise logged' : '💪 Exercise detected'}
                    </span>
                    <span className="text-xs" style={{ color: '#71717a' }}>
                      {msg.exercise.reduce((s, e) => s + e.kcalBurned, 0)} kcal burned
                    </span>
                  </div>
                  {msg.exercise.map((ex, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2"
                      style={{ borderBottom: i < msg.exercise!.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                      <div>
                        <div className="text-sm font-semibold text-white">{ex.emoji} {ex.name}</div>
                        <div className="text-xs" style={{ color: '#71717a' }}>{ex.durationMin} min</div>
                      </div>
                      <div className="font-bold text-sm" style={{ color: '#00d4ff' }}>−{ex.kcalBurned} kcal</div>
                    </div>
                  ))}
                </div>
              )}

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
                {[0,1,2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{ background: '#a855f7', animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 pt-1 scrollbar-none">
        {QUICK_CHIPS.map(chip => (
          <button key={chip.text}
            onClick={() => sendText(chip.text)}
            disabled={busy}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 disabled:opacity-40"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap' }}>
            {chip.label}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <div className="pb-1">
        <div className="flex gap-2 items-end">
          <textarea ref={textareaRef} rows={1}
            className="flex-1 rounded-2xl px-4 py-3 text-sm resize-none outline-none text-white placeholder:text-slate-500"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', maxHeight: 120 }}
            placeholder="biryani… 30 min walk… or both"
            value={input}
            onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText(input) } }}
          />
          {/* Mic button */}
          <button onClick={toggleVoice} disabled={busy}
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all disabled:opacity-40"
            style={listening
              ? { background: 'rgba(239,68,68,0.85)', border: '1px solid rgba(239,68,68,0.5)', boxShadow: '0 0 16px rgba(239,68,68,0.5)' }
              : { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
            {listening ? <MicOff size={18} className="text-white" /> : <Mic size={18} style={{ color: 'rgba(255,255,255,0.6)' }} />}
          </button>
          {/* Send button */}
          <button onClick={() => sendText(input)} disabled={!input.trim() || busy}
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,rgba(168,85,247,0.85),rgba(0,212,255,0.72))', border: '1px solid rgba(168,85,247,0.45)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)' }}>
            <Send size={18} className="text-slate-900" />
          </button>
        </div>
      </div>
    </div>
  )
}
