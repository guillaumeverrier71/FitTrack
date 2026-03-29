import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Dumbbell, Footprints, Flame, Scale, Home, User } from 'lucide-react'
import { useSession } from '../../context/SessionContext'
import WorkoutSession from '../workouts/WorkoutSession'
import OnboardingModal from '../onboarding/OnboardingModal'
import { supabase } from '../../lib/supabase'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { useOfflineSync } from '../../hooks/useOfflineSync'
import { useToast } from '../../context/ToastContext'
import { useLang } from '../../context/LangContext'

export default function AppLayout() {
  const { activeSession, sessionVisible, minimizeSession, resumeSession, closeSession } = useSession()
  const location = useLocation()
  const isOnline = useOnlineStatus()
  const toast = useToast()
  const { syncing, pendingCount } = useOfflineSync()
  const { t } = useLang()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingUserId, setOnboardingUserId] = useState(null)

  const navItems = [
    { to: '/', icon: Home, label: t('nav.home') },
    { to: '/workouts', icon: Dumbbell, label: t('nav.workouts') },
    { to: '/steps', icon: Footprints, label: t('nav.steps') },
    { to: '/nutrition', icon: Flame, label: t('nav.nutrition') },
    { to: '/weight', icon: Scale, label: t('nav.weight') },
    { to: '/profile', icon: User, label: t('nav.profile') },
  ]

  useEffect(() => {
    const handler = (e) => {
      toast.success(t('layout.syncDone', { n: e.detail.count, s: e.detail.count > 1 ? 's' : '' }))
    }
    window.addEventListener('bp-sync-complete', handler)
    return () => window.removeEventListener('bp-sync-complete', handler)
  }, [toast, t])

  useEffect(() => {
    const checkOnboarding = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      if (localStorage.getItem(`onboarding_done_${user.id}`)) return
      const { data: profile } = await supabase
        .from('user_profile')
        .select('height_cm')
        .eq('user_id', user.id)
        .single()
      if (!profile?.height_cm) {
        setOnboardingUserId(user.id)
        setShowOnboarding(true)
      } else {
        localStorage.setItem(`onboarding_done_${user.id}`, '1')
      }
    }
    checkOnboarding()
  }, [])

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      {showOnboarding && onboardingUserId && (
        <OnboardingModal
          userId={onboardingUserId}
          onDone={() => setShowOnboarding(false)}
        />
      )}

      {/* Overlay séance — monté en mémoire, masqué si non visible */}
      {activeSession && (
        <div className={sessionVisible ? 'fixed inset-0 z-50' : 'hidden'}>
          <WorkoutSession
            template={activeSession}
            onMinimize={minimizeSession}
            onDone={closeSession}
          />
        </div>
      )}

      {(!isOnline || syncing) && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-center gap-2">
          {syncing ? (
            <>
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              <p className="text-indigo-300 text-xs font-medium">{t('layout.syncing')}</p>
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-gray-400" />
              <p className="text-gray-300 text-xs font-medium">
                {pendingCount > 0
                  ? t('layout.offlinePending', { n: pendingCount, s: pendingCount > 1 ? 's' : '' })
                  : t('layout.offlineCache')}
              </p>
            </>
          )}
        </div>
      )}

      <main className={`flex-1 overflow-y-auto pb-20 ${!isOnline || syncing ? 'pt-8' : ''}`}>
        <div key={location.pathname} className="page-enter">
          <Outlet />
        </div>
      </main>

      {/* Bannière séance en cours — visible sur tous les onglets */}
      {activeSession && !sessionVisible && (
        <div className="fixed bottom-16 left-0 right-0 z-40 px-3 pb-1.5">
          <button
            onClick={resumeSession}
            className="w-full flex items-center justify-between bg-indigo-950/90 border border-indigo-500/40 backdrop-blur rounded-2xl px-4 py-2.5"
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              <div className="text-left">
                <p className="text-indigo-300 text-sm font-semibold">{t('layout.sessionBanner')}</p>
                <p className="text-gray-400 text-xs">{activeSession.name}</p>
              </div>
            </div>
            <span className="text-indigo-400 text-sm font-medium">{t('session.resume')}</span>
          </button>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800">
        <div className="flex justify-around items-center h-16">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                  isActive ? 'text-indigo-400' : 'text-gray-500'
                }`
              }
            >
              <Icon size={22} />
              <span className="text-xs">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
