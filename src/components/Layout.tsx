import { Outlet } from 'react-router-dom'
import TabBar from './TabBar'

export default function Layout() {
  return (
    <div className="min-h-full max-w-[480px] mx-auto flex flex-col">
      <div className="safe-top" />

      <main className="flex-1 overflow-y-auto px-4 pb-28 pt-3">
        <Outlet />
      </main>

      <TabBar />
    </div>
  )
}
