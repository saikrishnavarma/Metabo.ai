import React, { useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import Layout from './components/Layout'
import ScanPage from './pages/ScanPage'
import SearchPage from './pages/SearchPage'
import FoodDetailPage from './pages/FoodDetailPage'
import HistoryPage from './pages/HistoryPage'
import ProfilePage from './pages/ProfilePage'
import ExercisePage from './pages/ExercisePage'
import ManualEntryPage from './pages/ManualEntryPage'
import ProgressPage from './pages/ProgressPage'
import AIChatPage from './pages/AIChatPage'
import AuthPage from './pages/AuthPage'
import OnboardingPage from './pages/OnboardingPage'
import { useAuth } from './context/AuthContext'
import { useProfile } from './hooks/useProfile'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
    </div>
  )
  return user ? <>{children}</> : <Navigate to="/auth" replace />
}

function RequireProfile({ children }: { children: React.ReactNode }) {
  const { profile } = useProfile()
  if (profile === undefined) return null  // still loading from Dexie
  if (!profile.heightCm) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

function DeepLinkHandler() {
  const nav = useNavigate()
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const sub = CapApp.addListener('appUrlOpen', ({ url }) => {
      if (url.startsWith('metaboai://')) {
        const parsed = new URL(url.replace('metaboai://', 'https://x/'))
        const text = parsed.searchParams.get('text')
        nav(text ? `/ai?text=${encodeURIComponent(text)}` : '/ai')
      }
    })
    return () => { sub.then(h => h.remove()) }
  }, [nav])
  return null
}

export default function App() {
  const { user, loading } = useAuth()
  return (
    <>
      <DeepLinkHandler />
      <Routes>
        <Route path="/auth" element={loading ? null : user ? <Navigate to="/history" replace /> : <AuthPage />} />
        <Route path="/onboarding" element={<RequireAuth><OnboardingPage /></RequireAuth>} />
        <Route element={<RequireAuth><RequireProfile><Layout /></RequireProfile></RequireAuth>}>
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
    </>
  )
}
