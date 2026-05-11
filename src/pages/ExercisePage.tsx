import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Trash2, Flame, Clock, ChevronRight, X, Check } from 'lucide-react'
import { db, logExercise, type ExerciseLog } from '../lib/db'
import { EXERCISES, type ExerciseDef } from '../lib/exercises'
import { useProfile } from '../hooks/useProfile'
import { fmtTime } from '../lib/format'
import { useDateContext } from '../context/DateContext'

export default function ExercisePage() {
  const { profile } = useProfile()
  const weightKg = profile?.weightKg ?? 70
  const { selectedDate, isToday, isEditable, isArchived } = useDateContext()

  const entries = useLiveQuery(() => {
    const table = isArchived ? db.archivedExerciseLog : db.exerciseLog
    return table.where('dateKey').equals(selectedDate).reverse().sortBy('loggedAt')
  }, [selectedDate, isArchived]) ?? []

  const totalBurned = entries.reduce((s, e) => s + e.kcalBurned, 0)

  const [selected, setSelected] = useState<ExerciseDef | null>(null)
  const [duration, setDuration] = useState(30)
  const [logged, setLogged]     = useState(false)

  function kcalForDuration(ex: ExerciseDef, mins: number) {
    return Math.round(ex.met * weightKg * (mins / 60))
  }

  async function save() {
    if (!selected) return
    await logExercise({
      exerciseId: selected.id,
      name: selected.name,
      emoji: selected.emoji,
      durationMin: duration,
      kcalBurned: kcalForDuration(selected, duration),
    }, selectedDate)
    setLogged(true)
    setTimeout(() => { setSelected(null); setDuration(30); setLogged(false) }, 700)
  }

  return (
    <div className="space-y-4 pt-2">

      {/* Today summary */}
      <section className="rounded-2xl p-4 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(251,146,60,0.15), rgba(239,68,68,0.1))', border: '1px solid rgba(251,146,60,0.25)' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#fb923c' }}>{isArchived ? 'Burned (archived)' : isToday ? 'Burned today' : 'Burned this day'}</div>
            <div className="text-3xl font-extrabold text-white mt-1">{Math.round(totalBurned)}</div>
            <div className="text-xs mt-0.5" style={{ color: '#71717a' }}>kcal · {entries.length} {entries.length === 1 ? 'activity' : 'activities'}</div>
          </div>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(251,146,60,0.2)', border: '1px solid rgba(251,146,60,0.3)' }}>
            <Flame size={32} style={{ color: '#fb923c' }} />
          </div>
        </div>
      </section>

      {/* Exercise picker — available for all editable days */}
      {isArchived && (
        <div className="text-sm text-center py-4" style={{ color: '#71717a' }}>
          Archived — read only.
        </div>
      )}
      {isEditable && <>
        <section className="card">
          <h3 className="label mb-3">Pick an activity</h3>
          <div className="grid grid-cols-2 gap-2">
            {EXERCISES.map(ex => (
              <button
                key={ex.id}
                onClick={() => { setSelected(ex); setDuration(30); setLogged(false) }}
                className="flex items-center gap-3 p-3 rounded-xl border text-left transition-all"
                style={selected?.id === ex.id
                  ? { background: 'rgba(168,85,247,0.18)', borderColor: 'rgba(168,85,247,0.55)', boxShadow: '0 0 14px rgba(168,85,247,0.15), inset 0 1px 0 rgba(255,255,255,0.12)' }
                  : { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.09)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}
              >
                <span className="text-2xl">{ex.emoji}</span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate text-white">{ex.name}</div>
                  <div className="text-[11px]" style={{ color: '#71717a' }}>{kcalForDuration(ex, 30)} kcal/30m</div>
                </div>
                {selected?.id === ex.id && <ChevronRight size={14} style={{ color: '#a855f7' }} className="ml-auto shrink-0" />}
              </button>
            ))}
          </div>
        </section>

        {/* Duration + log panel */}
        {selected && (
        <section className="card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{selected.emoji}</span>
              <div>
                <div className="font-bold text-white">{selected.name}</div>
                <div className="text-xs" style={{ color: '#71717a' }}>{selected.meta}</div>
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="p-1 rounded-lg" style={{ color: '#71717a' }}>
              <X size={18} />
            </button>
          </div>

          {/* Duration slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="label flex items-center gap-1"><Clock size={12}/> Duration</div>
              <div className="font-bold text-white">{duration} min</div>
            </div>
            <input
              type="range" min={5} max={180} step={5}
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              className="w-full accent-[#a855f7]"
            />
            <div className="flex justify-between text-[10px] mt-1" style={{ color: '#71717a' }}>
              <span>5 min</span><span>180 min</span>
            </div>
          </div>

          {/* Quick duration buttons */}
          <div className="flex gap-2">
            {[15, 30, 45, 60, 90].map(d => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className="flex-1 py-1.5 rounded-xl text-xs font-semibold border transition-all"
                style={duration === d
                  ? { background: 'rgba(168,85,247,0.2)', borderColor: 'rgba(168,85,247,0.55)', color: '#c084fc', boxShadow: '0 0 10px rgba(168,85,247,0.15), inset 0 1px 0 rgba(255,255,255,0.12)' }
                  : { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.4)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}
              >
                {d}m
              </button>
            ))}
          </div>

          {/* Burn estimate */}
          <div className="rounded-2xl p-3 flex items-center justify-between"
            style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)' }}>
            <div>
              <div className="text-xs" style={{ color: '#71717a' }}>Estimated burn</div>
              <div className="text-xs mt-0.5" style={{ color: '#71717a' }}>Based on {weightKg}kg body weight</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-extrabold" style={{ color: '#fb923c' }}>
                {kcalForDuration(selected, duration)}
              </div>
              <div className="text-xs" style={{ color: '#71717a' }}>kcal</div>
            </div>
          </div>

          <button
            onClick={save}
            disabled={logged}
            className="w-full py-3.5 rounded-2xl text-sm font-bold transition-all"
            style={{
              background: logged ? 'rgba(168,85,247,0.6)' : 'linear-gradient(135deg,rgba(251,146,60,0.85),rgba(239,68,68,0.75))',
              color: 'white',
              border: logged ? '1px solid rgba(168,85,247,0.5)' : '1px solid rgba(251,146,60,0.4)',
              boxShadow: logged ? 'inset 0 1px 0 rgba(255,255,255,0.15)' : '0 4px 20px rgba(251,146,60,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
              backdropFilter: 'blur(8px)',
            }}
          >
            {logged
              ? <span className="flex items-center justify-center gap-2"><Check size={16}/> Logged!</span>
              : <span className="flex items-center justify-center gap-2"><Flame size={16}/> Log {kcalForDuration(selected, duration)} kcal burned</span>}
          </button>
          </section>
        )}
      </>}

      {/* Exercise log for selected date */}
      {entries.length > 0 && (
        <section className="card">
          <h3 className="label mb-3">Activities</h3>
          <ul className="space-y-2">
            {entries.map(e => (
              <ExerciseRow key={e.id} entry={e} canDelete={isEditable} />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function ExerciseRow({ entry, canDelete }: { entry: ExerciseLog; canDelete: boolean }) {
  return (
    <li className="flex items-center gap-3 py-2 border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
        style={{ background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.2)' }}>
        {entry.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-white">{entry.name}</div>
        <div className="text-xs" style={{ color: '#71717a' }}>{entry.durationMin} min · {fmtTime(entry.loggedAt)}</div>
      </div>
      <div className="text-right mr-2">
        <div className="font-bold" style={{ color: '#fb923c' }}>−{Math.round(entry.kcalBurned)}</div>
        <div className="text-[10px]" style={{ color: '#71717a' }}>kcal</div>
      </div>
      {canDelete && (
        <button
          onClick={() => entry.id && db.exerciseLog.delete(entry.id)}
          className="p-1.5 rounded-lg"
          style={{ color: '#71717a' }}
        >
          <Trash2 size={15} />
        </button>
      )}
    </li>
  )
}
