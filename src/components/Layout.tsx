import { useRef } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import TabBar from './TabBar'

const TABS = ['/history', '/scan', '/exercise', '/progress', '/profile']

export default function Layout() {
  const nav            = useNavigate()
  const { pathname }   = useLocation()
  const onAI           = pathname === '/ai'
  const currentIdx     = TABS.indexOf(pathname)

  const touchStartX    = useRef(0)
  const touchStartY    = useRef(0)
  const directionRef   = useRef<'left' | 'right'>('left')

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  function onTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current

    // Only act on clearly horizontal swipes
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return
    // Ignore swipes that start near the left edge (back gesture)
    if (touchStartX.current < 30) return

    if (dx < 0 && currentIdx < TABS.length - 1) {
      directionRef.current = 'left'
      nav(TABS[currentIdx + 1])
    } else if (dx > 0 && currentIdx > 0) {
      directionRef.current = 'right'
      nav(TABS[currentIdx - 1])
    }
  }

  const variants = {
    enter:  (dir: 'left' | 'right') => ({ x: dir === 'left' ?  '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:   (dir: 'left' | 'right') => ({ x: dir === 'left' ? '-100%' :  '100%', opacity: 0 }),
  }

  return (
    <div className="min-h-full max-w-[480px] mx-auto flex flex-col overflow-hidden">
      <div className="safe-top" />

      <div className="flex-1 relative overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <AnimatePresence initial={false} custom={directionRef.current} mode="popLayout">
          <motion.main
            key={pathname}
            custom={directionRef.current}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'tween', duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="absolute inset-0 overflow-y-auto px-4 pb-28 pt-3"
          >
            <Outlet />
          </motion.main>
        </AnimatePresence>
      </div>

      {!onAI && (
        <button
          onClick={() => nav('/ai')}
          className="fixed z-40 flex items-center gap-2 px-4 py-3 rounded-2xl active:scale-95 transition-all"
          style={{
            bottom: '88px',
            right: '16px',
            background: 'linear-gradient(135deg,rgba(168,85,247,0.92),rgba(0,212,255,0.78))',
            border: '1px solid rgba(168,85,247,0.5)',
            boxShadow: '0 4px 24px rgba(168,85,247,0.45), inset 0 1px 0 rgba(255,255,255,0.2)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <Sparkles size={16} className="text-white" />
          <span className="text-white text-sm font-bold">Log with AI</span>
        </button>
      )}

      <TabBar />
    </div>
  )
}
