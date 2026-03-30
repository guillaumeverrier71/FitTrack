import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useLang } from '../../context/LangContext'

function translateError(msg, t) {
  if (msg?.includes('Invalid login credentials')) return t('auth.errInvalidCredentials')
  if (msg?.includes('Email not confirmed')) return t('auth.errEmailNotConfirmed')
  if (msg?.includes('User already registered')) return t('auth.errAlreadyRegistered')
  if (msg?.includes('Password should be at least 6 characters')) return t('auth.errWeakPassword')
  if (msg?.includes('Unable to validate email address: invalid format')) return t('auth.errInvalidEmail')
  if (msg?.includes('signup is disabled')) return t('auth.errSignupDisabled')
  return msg || t('auth.errDefault')
}

export default function AuthPage() {
  const { t, lang, setLang } = useLang()
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
      if (error) setError(translateError(error.message, t))
      else setSuccess(t('auth.resetLinkSent'))
      setLoading(false)
      return
    }

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(translateError(error.message, t))
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(translateError(error.message, t))
      else setSuccess(t('auth.confirmEmailSent'))
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
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-24 h-24 rounded-2xl overflow-hidden shadow-lg"
              style={{
                backgroundImage: 'url(/fitnavigator-logo.png)',
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundColor: 'white',
              }}
            />
            <p className="text-gray-400 text-sm">Take control of your body</p>
          </div>

          {/* Card formulaire */}
          <div className="bg-gray-900 rounded-3xl p-6 flex flex-col gap-5 shadow-xl">

            {forgotPassword ? (
              <>
                <div>
                  <h2 className="text-white font-semibold">{t('auth.forgotPasswordTitle')}</h2>
                  <p className="text-gray-400 text-sm mt-1">{t('auth.forgotPasswordDesc')}</p>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                  <input
                    type="email"
                    placeholder={t('auth.email')}
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
                      {loading ? t('auth.sending') : t('auth.sendLink')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={closeForgotPassword}
                    className="text-gray-500 text-sm text-center hover:text-white transition-colors"
                  >
                    {t('auth.backToLogin')}
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
                    { key: 'login', label: t('auth.login') },
                    { key: 'signup', label: t('auth.signup') },
                  ].map(tabItem => (
                    <button
                      key={tabItem.key}
                      onClick={() => handleTabSwitch(tabItem.key)}
                      className={`relative z-10 flex-1 py-2 text-sm font-medium transition-colors duration-300 rounded-xl ${
                        tab === tabItem.key ? 'text-white' : 'text-gray-500'
                      }`}
                    >
                      {tabItem.label}
                    </button>
                  ))}
                </div>

                {/* Champs */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                  <input
                    type="email"
                    placeholder={t('auth.email')}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="bg-gray-800 text-white rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500 transition-shadow"
                  />
                  <div className="flex flex-col gap-1">
                    <input
                      type="password"
                      placeholder={t('auth.password')}
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
                        {t('auth.forgotPassword')}
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
                    {loading ? t('auth.loadingBtn') : isLogin ? t('auth.loginBtn') : t('auth.signupBtn')}
                  </button>
                </form>
              </>
            )}
          </div>

          {!isLogin && !forgotPassword && (
            <p className="text-gray-600 text-xs text-center px-4">
              {t('auth.privacyNote')}
            </p>
          )}

          {/* Sélecteur de langue */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setLang('fr')}
              className={`text-sm px-3 py-1.5 rounded-xl transition-colors ${lang === 'fr' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400'}`}
            >
              🇫🇷 Français
            </button>
            <button
              onClick={() => setLang('en')}
              className={`text-sm px-3 py-1.5 rounded-xl transition-colors ${lang === 'en' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400'}`}
            >
              🇬🇧 English
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
