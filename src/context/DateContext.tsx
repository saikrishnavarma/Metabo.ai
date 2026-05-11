import { createContext, useContext, useState } from 'react'

function getDateKey(offset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  const y   = d.getFullYear()
  const m   = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

interface DateContextValue {
  dayOffset:    number
  setDayOffset: (offset: number) => void
  selectedDate: string
  isToday:      boolean
  isEditable:   boolean   // within 3 editable days
  isArchived:   boolean   // older than 3 days → read-only archive
}

const DateContext = createContext<DateContextValue | null>(null)

export function DateProvider({ children }: { children: React.ReactNode }) {
  const [dayOffset, setDayOffset] = useState(0)

  const selectedDate = getDateKey(dayOffset)
  const isToday    = dayOffset === 0
  const isEditable = dayOffset >= -2
  const isArchived = dayOffset < -2

  return (
    <DateContext.Provider value={{ dayOffset, setDayOffset, selectedDate, isToday, isEditable, isArchived }}>
      {children}
    </DateContext.Provider>
  )
}

export function useDateContext(): DateContextValue {
  const ctx = useContext(DateContext)
  if (!ctx) throw new Error('useDateContext must be used within DateProvider')
  return ctx
}
