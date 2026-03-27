import { useState } from 'react'
import { Dumbbell } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const SUPABASE_ERRORS = {
  'Invalid login credentials': 'Email ou mot de passe incorrect.',
  'Email not confirmed': 'Confirme ton email avant de te connecter.',
  'User already registered': 'Un compte existe déjà avec cet email.',
  'Password should be at least 6 characters': 'Le mot de passe doit faire au moins 6 caractères.',
  'Unable to validate email address: invalid format': 'Adresse email invalide.',
  'signup is disabled': "Les inscriptions sont désactivées pour le moment.",
}

function translateError(msg) {
  for (const [key, val] of Object.entries(SUPABASE_ERRORS)) {
    if (msg?.includes(key)) return val
  }
  return msg || 'Une erreur est survenue.'
}

export default function AuthPage() {
  const [tab, setTab] = useState('login')
  const [forgotPassword, setForgotPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const isLogin = tab === 'login'

  const handleSubmit = async (e) => {
    e?.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    if (forgotPassword) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) setError(translateError(error.message))
      else setSuccess('Un lien de réinitialisation a été envoyé à ton adresse email.')
      setLoading(false)
      return
    }

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(translateError(error.message))
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(translateError(error.message))
      else setSuccess('Vérifie ta boîte mail pour confirmer ton compte !')
    }

    setLoading(false)
  }

  const handleTabSwitch = (newTab) => {
    setTab(newTab)
    setError(null)
    setSuccess(null)
    setForgotPassword(false)
  }

  const openForgotPassword = () => {
    setForgotPassword(true)
    setError(null)
    setSuccess(null)
  }

  const closeForgotPassword = () => {
    setForgotPassword(false)
    setError(null)
    setSuccess(null)
  }

  return (
    <div className="h-screen flex flex-col bg-gray-950 overflow-hidden">

      {/* Fond décoratif */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-800/15 rounded-full blur-3xl" />
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm flex flex-col gap-8">

          {/* Logo + titre */}
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Dumbbell size={32} className="text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-bold text-white tracking-tight">FitTrack</h1>
              <p className="text-gray-400 text-sm mt-1">Suis ta progression, bats tes records</p>
            </div>
          </div>

          {/* Card formulaire */}
          <div className="bg-gray-900 rounded-3xl p-6 flex flex-col gap-5 shadow-xl">

            {forgotPassword ? (
              <>
                <div>
                  <h2 className="text-white font-semibold">Mot de passe oublié</h2>
                  <p className="text-gray-400 text-sm mt-1">Saisis ton email et on t'envoie un lien de réinitialisation.</p>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                  <input
                    type="email"
                    placeholder="Adresse email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoFocus
                    className="bg-gray-800 text-white rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500"
                  />
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                      <p className="text-red-400 text-sm">{error}</p>
                    </div>
                  )}
                  {success && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
                      <p className="text-green-400 text-sm">{success}</p>
                    </div>
                  )}
                  {!success && (
                    <button
                      type="submit"
                      disabled={loading || !email}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold py-3.5 rounded-xl transition-colors"
                    >
                      {loading ? 'Envoi…' : 'Envoyer le lien'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={closeForgotPassword}
                    className="text-gray-500 text-sm text-center hover:text-white transition-colors"
                  >
                    ← Retour à la connexion
                  </button>
                </form>
              </>
            ) : (
              <>
                {/* Onglets */}
                <div className="relative flex bg-gray-800 rounded-2xl p-1">
                  <div
                    className="absolute top-1 bottom-1 w-1/2 bg-indigo-600 rounded-xl transition-transform duration-300 ease-in-out"
                    style={{ transform: isLogin ? 'translateX(0)' : 'translateX(100%)' }}
                  />
                  {[
                    { key: 'login', label: 'Connexion' },
                    { key: 'signup', label: 'Inscription' },
                  ].map(t => (
                    <button
                      key={t.key}
                      onClick={() => handleTabSwitch(t.key)}
                      className={`relative z-10 flex-1 py-2 text-sm font-medium transition-colors duration-300 rounded-xl ${
                        tab === t.key ? 'text-white' : 'text-gray-500'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Champs */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                  <input
                    type="email"
                    placeholder="Adresse email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="bg-gray-800 text-white rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500 transition-shadow"
                  />
                  <div className="flex flex-col gap-1">
                    <input
                      type="password"
                      placeholder="Mot de passe"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      className="bg-gray-800 text-white rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500 transition-shadow"
                    />
                    {isLogin && (
                      <button
                        type="button"
                        onClick={openForgotPassword}
                        className="text-indigo-400 text-xs text-right hover:text-indigo-300 transition-colors pr-1 pt-1"
                      >
                        Mot de passe oublié ?
                      </button>
                    )}
                  </div>

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                      <p className="text-red-400 text-sm">{error}</p>
                    </div>
                  )}
                  {success && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
                      <p className="text-green-400 text-sm">{success}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !email || !password}
                    className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-40 text-white font-semibold py-3.5 rounded-xl transition-colors mt-1 shadow-md shadow-indigo-600/20"
                  >
                    {loading ? 'Chargement...' : isLogin ? 'Se connecter' : 'Créer mon compte'}
                  </button>
                </form>
              </>
            )}
          </div>

          {!isLogin && !forgotPassword && (
            <p className="text-gray-600 text-xs text-center px-4">
              En créant un compte, tu acceptes de l'utiliser pour suivre tes entraînements. Tes données restent privées.
            </p>
          )}

        </div>
      </div>
    </div>
  )
}
