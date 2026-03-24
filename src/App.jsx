import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import AuthPage from './pages/auth/AuthPage'
import AppLayout from './components/layout/AppLayout'
import WorkoutsPage from './pages/app/WorkoutsPage'
import StepsPage from './pages/app/StepsPage'
import DashboardPage from './pages/app/DashboardPage'
import WeightPage from './pages/app/WeightPage'
import ProfilePage from './pages/app/ProfilePage'
import NutritionPage from './pages/app/NutritionPage'

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return (
    <div className="h-screen flex items-center justify-center bg-gray-950">
      <p className="text-white">Chargement...</p>
    </div>
  )

  return (
    <Routes>
      <Route path="/auth" element={!session ? <AuthPage /> : <Navigate to="/" />} />
      <Route path="/*" element={session ? <AppLayout /> : <Navigate to="/auth" />}>
        <Route index element={<DashboardPage />} />
        <Route path="workouts" element={<WorkoutsPage />} />
        <Route path="steps" element={<StepsPage />} />
        <Route path="weight" element={<WeightPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="nutrition" element={<NutritionPage />} />
      </Route>
    </Routes>
  )
}