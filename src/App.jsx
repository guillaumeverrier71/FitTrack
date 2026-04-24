import { useEffect, useState, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { SessionProvider } from './context/SessionContext'
import { ToastProvider } from './context/ToastContext'
import { LangProvider } from './context/LangContext'
import { UnitProvider } from './context/UnitContext'
import { PremiumProvider } from './context/PremiumContext'
import ErrorBoundary from './components/ui/ErrorBoundary'
import FirstLaunchScreen from './components/onboarding/FirstLaunchScreen'
import { Analytics } from '@vercel/analytics/react'

const AuthPage = lazy(() => import('./pages/auth/AuthPage'))
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'))
const AppLayout = lazy(() => import('./components/layout/AppLayout'))
const DashboardPage = lazy(() => import('./pages/app/DashboardPage'))
const WorkoutsPage = lazy(() => import('./pages/app/WorkoutsPage'))
const StepsPage = lazy(() => import('./pages/app/StepsPage'))
const WeightPage = lazy(() => import('./pages/app/WeightPage'))
const ProfilePage = lazy(() => import('./pages/app/ProfilePage'))
const NutritionPage = lazy(() => import('./pages/app/NutritionPage'))
const PrivacyPage = lazy(() => import('./pages/app/PrivacyPage'))
const PremiumSuccessPage = lazy(() => import('./pages/app/PremiumSuccessPage'))

function PageLoader() {
  return (
    <div className="h-screen flex items-center justify-center bg-gray-950">
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(undefined)
  const [firstLaunchDone, setFirstLaunchDone] = useState(
    () => !!localStorage.getItem('first_launch_done')
  )

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
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <ErrorBoundary>
      <LangProvider>
      <UnitProvider>
      <PremiumProvider>
      <ToastProvider>
        {!firstLaunchDone && (
          <FirstLaunchScreen onDone={() => setFirstLaunchDone(true)} />
        )}
        <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/auth" element={!session ? <AuthPage /> : <Navigate to="/" />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/*" element={session ? <SessionProvider><AppLayout /></SessionProvider> : <Navigate to="/auth" />}>
            <Route index element={<DashboardPage />} />
            <Route path="workouts" element={<WorkoutsPage />} />
            <Route path="steps" element={<StepsPage />} />
            <Route path="weight" element={<WeightPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="nutrition" element={<NutritionPage />} />
            <Route path="privacy" element={<PrivacyPage />} />
            <Route path="premium-success" element={<PremiumSuccessPage />} />
          </Route>
        </Routes>
        </Suspense>
      </ToastProvider>
      </PremiumProvider>
      </UnitProvider>
      </LangProvider>
      <Analytics />
    </ErrorBoundary>
  )
}