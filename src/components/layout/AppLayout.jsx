import { Outlet, NavLink } from 'react-router-dom'
import { Dumbbell, Footprints, Flame, Scale, Home, User } from 'lucide-react'

const navItems = [
  { to: '/', icon: Home, label: 'Accueil' },
  { to: '/workouts', icon: Dumbbell, label: 'Séances' },
  { to: '/steps', icon: Footprints, label: 'Pas' },
  { to: '/nutrition', icon: Flame, label: 'Calories' },
  { to: '/weight', icon: Scale, label: 'Poids' },
  { to: '/profile', icon: User, label: 'Profil' },
]

export default function AppLayout() {
  return (
    <div className="h-screen flex flex-col bg-gray-950">
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
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