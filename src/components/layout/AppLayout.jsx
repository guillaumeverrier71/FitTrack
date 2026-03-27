import { Outlet, NavLink } from 'react-router-dom'
import { Dumbbell, Footprints, Flame, Scale, Home, User } from 'lucide-react'
import { useSession } from '../../context/SessionContext'
import WorkoutSession from '../workouts/WorkoutSession'

const navItems = [
  { to: '/', icon: Home, label: 'Accueil' },
  { to: '/workouts', icon: Dumbbell, label: 'Séances' },
  { to: '/steps', icon: Footprints, label: 'Pas' },
  { to: '/nutrition', icon: Flame, label: 'Calories' },
  { to: '/weight', icon: Scale, label: 'Poids' },
  { to: '/profile', icon: User, label: 'Profil' },
]

export default function AppLayout() {
  const { activeSession, sessionVisible, minimizeSession, resumeSession, closeSession } = useSession()

  return (
    <div className="h-screen flex flex-col bg-gray-950">
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

      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
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
                <p className="text-indigo-300 text-sm font-semibold">Séance en cours</p>
                <p className="text-gray-400 text-xs">{activeSession.name}</p>
              </div>
            </div>
            <span className="text-indigo-400 text-sm font-medium">Reprendre →</span>
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
