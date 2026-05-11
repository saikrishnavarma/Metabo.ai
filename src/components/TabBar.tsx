import { NavLink } from 'react-router-dom'
import { BarChart2, Utensils, TrendingUp, User, Dumbbell } from 'lucide-react'
import { useDateContext } from '../context/DateContext'

const TABS = [
  { to: '/history',  icon: BarChart2,  label: 'Today'    },
  { to: '/scan',     icon: Utensils,   label: 'Add Food'  },
  { to: '/exercise', icon: Dumbbell,   label: 'Exercise'  },
  { to: '/progress', icon: TrendingUp, label: 'Progress'  },
  { to: '/profile',  icon: User,       label: 'Profile'   },
]

export default function TabBar() {
  const { isToday, dayOffset } = useDateContext()
  const historyLabel = isToday ? 'Today' : dayOffset === -1 ? 'Yesterday' : `${Math.abs(dayOffset)}d ago`

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto safe-bottom z-30"
      style={{
        background: 'rgba(8,6,18,0.7)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
      }}>
      <div className="flex items-center justify-around px-1 pt-1.5 pb-1">
        {TABS.map(({ to, icon: Icon, label: rawLabel }) => {
          const label = to === '/history' ? historyLabel : rawLabel
          return (
          <NavLink key={to} to={to} end
            className="flex flex-col items-center min-w-0 flex-1"
          >
            {({ isActive }) => (
              <div className="flex flex-col items-center gap-0.5 w-full px-0.5 py-1.5 rounded-2xl transition-all duration-200"
                style={isActive ? {
                  background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(0,212,255,0.1))',
                  boxShadow: '0 0 16px rgba(168,85,247,0.25), inset 0 1px 0 rgba(168,85,247,0.2)',
                } : {}}>
                <Icon
                  size={19}
                  style={isActive
                    ? { color: '#c084fc', filter: 'drop-shadow(0 0 8px rgba(168,85,247,0.8))' }
                    : { color: 'rgba(255,255,255,0.35)' }}
                />
                <span className="text-[9px] font-semibold truncate w-full text-center"
                  style={{ color: isActive ? '#c084fc' : 'rgba(255,255,255,0.35)' }}>
                  {label}
                </span>
              </div>
            )}
          </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
