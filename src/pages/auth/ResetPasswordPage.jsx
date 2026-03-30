import { useState, useEffect } from 'react'
import { CheckCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Supabase parse automatiquement le token dans l'URL (#access_token=...&type=recovery)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }
    if (password.length < 6) { setError('Le mot de passe doit faire au moins 6 caractères.'); return }

    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) setError(error.message)
    else setDone(true)
    setLoading(false)
  }

  return (
    <div className="h-screen flex flex-col bg-gray-950 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-800/15 rounded-full blur-3xl" />
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm flex flex-col gap-8">

          <div className="flex flex-col items-center gap-4">
            <div
              className="w-24 h-24 rounded-2xl overflow-hidden shadow-lg"
              style={{
                backgroundImage: 'url(/fitnavigator-logo.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                
              }}
            />
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white">Nouveau mot de passe</h1>
              <p className="text-gray-400 text-sm mt-1">Choisis un nouveau mot de passe sécurisé</p>
            </div>
          </div>

          <div className="bg-gray-900 rounded-3xl p-6 shadow-xl">
            {done ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <CheckCircle size={48} className="text-green-400" />
                <p className="text-white font-semibold text-center">Mot de passe mis à jour !</p>
                <p className="text-gray-400 text-sm text-center">Tu peux maintenant te connecter avec ton nouveau mot de passe.</p>
                <a
                  href="/auth"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3.5 rounded-xl transition-colors text-center block mt-2"
                >
                  Se connecter
                </a>
              </div>
            ) : !ready ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-400 text-sm">Vérification du lien…</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <input
                  type="password"
                  placeholder="Nouveau mot de passe"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoFocus
                  className="bg-gray-800 text-white rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500"
                />
                <input
                  type="password"
                  placeholder="Confirmer le mot de passe"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  className="bg-gray-800 text-white rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500"
                />
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading || !password || !confirm}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold py-3.5 rounded-xl transition-colors mt-1"
                >
                  {loading ? 'Mise à jour…' : 'Mettre à jour'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
