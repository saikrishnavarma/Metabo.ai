import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ScanPage from './pages/ScanPage'
import SearchPage from './pages/SearchPage'
import FoodDetailPage from './pages/FoodDetailPage'
import HistoryPage from './pages/HistoryPage'
import ProfilePage from './pages/ProfilePage'
import ExercisePage from './pages/ExercisePage'
import ManualEntryPage from './pages/ManualEntryPage'
import AIChatPage from './pages/AIChatPage'
import ProgressPage from './pages/ProgressPage'
import AuthPage from './pages/AuthPage'
import { useAuth } from './context/AuthContext'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
    </div>
  )
  return user ? <>{children}</> : <Navigate to="/auth" replace />
}

export default function App() {
  const { user, loading } = useAuth()
  return (
    <Routes>
      <Route path="/auth" element={loading ? null : user ? <Navigate to="/history" replace /> : <AuthPage />} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Navigate to="/history" replace />} />
        <Route path="/history"    element={<HistoryPage />} />
        <Route path="/scan"       element={<ScanPage />} />
        <Route path="/search"     element={<SearchPage />} />
        <Route path="/food/:id"   element={<FoodDetailPage />} />
        <Route path="/exercise"   element={<ExercisePage />} />
        <Route path="/add-manual" element={<ManualEntryPage />} />
        <Route path="/ai"         element={<AIChatPage />} />
        <Route path="/progress"   element={<ProgressPage />} />
        <Route path="/profile"    element={<ProfilePage />} />
        <Route path="*"           element={<Navigate to="/history" replace />} />
      </Route>
    </Routes>
  )
}
