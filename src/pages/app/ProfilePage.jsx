import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { User, Mail, Ruler, Target, LogOut, Pencil, Check, Camera, Flame, Bell, BellOff } from 'lucide-react'
import Medals from '../../components/profile/Medals'
import ConfirmModal from '../../components/ui/ConfirmModal'
import { useToast } from '../../context/ToastContext'
import { handleSupabaseError } from '../../lib/handleError'
import { usePushNotifications } from '../../hooks/usePushNotifications'

export default function ProfilePage() {
  const toast = useToast()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [editing, setEditing] = useState(false)
  const [inputFirstName, setInputFirstName] = useState('')
  const [inputLastName, setInputLastName] = useState('')
  const [inputHeight, setInputHeight] = useState('')
  const [inputGoal, setInputGoal] = useState('')
  const [inputAge, setInputAge] = useState('')
  const [inputGender, setInputGender] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [stats, setStats] = useState(null)
  const [currentWeight, setCurrentWeight] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef(null)

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      const fullName = user?.user_metadata?.full_name || ''
      const parts = fullName.trim().split(' ')
      setInputFirstName(parts[0] || '')
      setInputLastName(parts.slice(1).join(' ') || '')
      setAvatarUrl(user?.user_metadata?.avatar_url || null)

      const { data: profileData } = await supabase
        .from('user_profile')
        .select('*')
        .eq('user_id', user.id)
        .single()

      setProfile(profileData)
      setInputHeight(profileData?.height_cm?.toString() || '')
      setInputGoal(profileData?.weight_goal_kg?.toString() || '')
      setInputAge(profileData?.age?.toString() || '')
      setInputGender(profileData?.gender || '')
      setNotifEnabled(profileData?.notif_enabled || false)
      setNotifTime(profileData?.notif_time || '18:00')
      setNotifInactivityDays(profileData?.notif_inactivity_days || 2)

      // Poids actuel
      const { data: weightEntries } = await supabase
        .from('weight_entries')
        .select('weight_kg')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(1)
      setCurrentWeight(weightEntries?.[0]?.weight_kg || null)

      // Stats rapides
      const { count: sessionsCount } = await supabase
        .from('workout_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .not('finished_at', 'is', null)

      const { data: allSessions } = await supabase
        .from('workout_sessions')
        .select('finished_at')
        .eq('user_id', user.id)
        .not('finished_at', 'is', null)
        .order('finished_at', { ascending: false })

      let streak = 0
      if (allSessions?.length) {
        const uniqueDays = [...new Set(allSessions.map(s => s.finished_at.split('T')[0]))]
        let current = new Date()
        for (const day of uniqueDays) {
          const d = new Date(day)
          const diff = Math.floor((current - d) / 1000 / 60 / 60 / 24)
          if (diff <= 1) { streak++; current = d }
          else break
        }
      }

      const { data: setsData } = await supabase
        .from('session_sets')
        .select('weight_kg, reps, workout_sessions!inner(user_id)')
        .eq('workout_sessions.user_id', user.id)

      const totalVolume = setsData
        ? Math.round(setsData.reduce((s, set) => s + (set.weight_kg * set.reps), 0))
        : 0

      setStats({ sessions: sessionsCount || 0, streak, totalVolume })
      setLoading(false)
    } catch (err) {
      await handleSupabaseError(err, toast, 'Erreur de chargement.')
    }
  }

  useEffect(() => { fetchData() }, [])

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/avatar.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })

      if (!uploadError) {
        const { data } = supabase.storage.from('avatars').getPublicUrl(path)
        const url = `${data.publicUrl}?t=${Date.now()}`
        await supabase.auth.updateUser({ data: { avatar_url: url } })
        setAvatarUrl(url)
        toast.success('Photo mise à jour !')
      }
    } catch (err) {
      await handleSupabaseError(err, toast, 'Erreur lors du téléchargement de la photo.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const fullName = [inputFirstName.trim(), inputLastName.trim()].filter(Boolean).join(' ')
      await supabase.auth.updateUser({ data: { full_name: fullName } })
      await supabase.from('user_profile').upsert({
        user_id: user.id,
        height_cm: parseFloat(inputHeight) || null,
        weight_goal_kg: parseFloat(inputGoal) || null,
        age: parseInt(inputAge) || null,
        gender: inputGender || null,
      }, { onConflict: 'user_id' })
      setSaving(false)
      setEditing(false)
      toast.success('Profil sauvegardé !')
      fetchData()
    } catch (err) {
      setSaving(false)
      await handleSupabaseError(err, toast, 'Erreur lors de la sauvegarde.')
    }
  }

  const [confirmLogout, setConfirmLogout] = useState(false)

  // Notifications
  const { supported: pushSupported, subscribed, loading: pushLoading, subscribe, unsubscribe } = usePushNotifications()

  const handleToggleNotif = async () => {
    if (!subscribed) {
      const ok = await subscribe()
      if (!ok) return
      setNotifEnabled(true)
      await saveNotifSettings(true, notifTime, notifInactivityDays)
    } else {
      await unsubscribe()
      setNotifEnabled(false)
      await saveNotifSettings(false, notifTime, notifInactivityDays)
    }
  }

  const saveNotifSettings = async (enabled, time, days) => {
    try {
      const { data: { user: u } } = await supabase.auth.getUser()
      await supabase.from('user_profile').upsert({
        user_id: u.id,
        notif_enabled: enabled,
        notif_time: time,
        notif_inactivity_days: days,
      }, { onConflict: 'user_id' })
    } catch {}
  }
  const [notifEnabled, setNotifEnabled] = useState(false)
  const [notifTime, setNotifTime] = useState('18:00')
  const [notifInactivityDays, setNotifInactivityDays] = useState(2)

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      await handleSupabaseError(err, toast, 'Erreur lors de la déconnexion.')
    }
  }

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-gray-950">
      <p className="text-white">Chargement...</p>
    </div>
  )

  const initials = (inputFirstName || inputLastName)
    ? [inputFirstName[0], inputLastName[0]].filter(Boolean).join('').toUpperCase()
    : user?.email?.[0].toUpperCase()

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : null


  return (
    <div className="pb-24 bg-gray-950 min-h-screen">

      {/* Header */}
      <div className="bg-gray-900 px-4 pt-8 pb-6 flex flex-col items-center gap-4">
        {/* Photo */}
        <div className="relative">
          <div
            className="w-24 h-24 rounded-full overflow-hidden bg-indigo-600 flex items-center justify-center cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-3xl font-bold">{initials}</span>
            )}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPhoto}
            className="absolute bottom-0 right-0 bg-indigo-600 hover:bg-indigo-500 text-white p-1.5 rounded-full border-2 border-gray-900 transition-colors"
          >
            {uploadingPhoto ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera size={13} />
            )}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
        </div>

        {/* Nom + email + membre depuis */}
        <div className="text-center">
          <h1 className="text-xl font-bold text-white">
            {[inputFirstName, inputLastName].filter(Boolean).join(' ') || 'Mon profil'}
          </h1>
          <p className="text-gray-400 text-sm">{user?.email}</p>
          {memberSince && (
            <p className="text-gray-600 text-xs mt-1">Membre depuis {memberSince}</p>
          )}
        </div>

        {/* Stats rapides */}
        {stats && (
          <div className="flex gap-6 mt-1">
            <div className="text-center">
              <p className="text-white font-bold text-lg">{stats.sessions}</p>
              <p className="text-gray-500 text-xs">Séances</p>
            </div>
            <div className="w-px bg-gray-800" />
            <div className="text-center">
              <p className="text-white font-bold text-lg flex items-center gap-1 justify-center">
                {stats.streak} <Flame size={14} className="text-orange-400" />
              </p>
              <p className="text-gray-500 text-xs">Streak</p>
            </div>
            <div className="w-px bg-gray-800" />
            <div className="text-center">
              <p className="text-white font-bold text-lg">{(stats.totalVolume / 1000).toFixed(1)}t</p>
              <p className="text-gray-500 text-xs">Soulevé</p>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col gap-4">

        {/* Objectif poids */}
        {currentWeight && profile?.weight_goal_kg && (() => {
          const curr = parseFloat(currentWeight)
          const goal = parseFloat(profile.weight_goal_kg)
          const isGain = goal > curr
          const goalReached = isGain ? curr >= goal : curr <= goal
          const diff = Math.abs(curr - goal).toFixed(1)
          // Barre : pour une prise, curr/goal ; pour une perte, on inverse
          const barWidth = goalReached ? 100 : isGain
            ? Math.max(5, Math.round((curr / goal) * 100))
            : Math.max(5, Math.round((1 - (curr - goal) / curr) * 100))

          return (
            <div className="bg-gray-900 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Target size={15} className="text-indigo-400" />
                  <p className="text-white font-semibold text-sm">Objectif de poids</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">{curr} kg</span>
                  <span className="text-gray-600 text-xs">→</span>
                  <span className="text-indigo-400 text-sm font-medium">{goal} kg</span>
                </div>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${goalReached ? 'bg-green-500' : 'bg-indigo-500'}`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              {goalReached ? (
                <p className="text-green-400 text-xs mt-2">🎉 Objectif atteint !</p>
              ) : (
                <p className="text-gray-500 text-xs mt-2">
                  {isGain ? `+${diff} kg` : `-${diff} kg`} restants
                </p>
              )}
            </div>
          )
        })()}

        {/* Informations */}
        <div className="bg-gray-900 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Informations</h2>
            <button
              onClick={() => editing ? handleSave() : setEditing(true)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              {editing ? <Check size={18} /> : <Pencil size={18} />}
            </button>
          </div>

          {editing ? (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Prénom</label>
                  <input type="text" value={inputFirstName} onChange={e => setInputFirstName(e.target.value)}
                    placeholder="ex: Jean" autoFocus
                    className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 w-full" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Nom</label>
                  <input type="text" value={inputLastName} onChange={e => setInputLastName(e.target.value)}
                    placeholder="ex: Dupont"
                    className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 w-full" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Taille (cm)</label>
                  <input type="number" value={inputHeight} onChange={e => setInputHeight(e.target.value)}
                    placeholder="ex: 178"
                    className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 w-full" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Âge</label>
                  <input type="number" value={inputAge} onChange={e => setInputAge(e.target.value)}
                    placeholder="ex: 28"
                    className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 w-full" />
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Genre</label>
                <div className="flex gap-2">
                  {['homme', 'femme'].map(g => (
                    <button key={g} onClick={() => setInputGender(g)}
                      className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${inputGender === g ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
                      {g === 'homme' ? 'Homme' : 'Femme'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Objectif de poids (kg)</label>
                <input type="number" step="0.5" value={inputGoal} onChange={e => setInputGoal(e.target.value)}
                  placeholder="ex: 75"
                  className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 w-full" />
              </div>
              <div className="flex gap-2 mt-1">
                <button onClick={() => setEditing(false)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-400 font-semibold py-3 rounded-xl transition-colors">
                  Annuler
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors">
                  {saving ? 'Enregistrement...' : 'Sauvegarder'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-gray-800">
              {[
                { icon: <User size={15} className="text-indigo-400" />, label: 'Prénom', value: inputFirstName || 'Non renseigné' },
                { icon: <User size={15} className="text-indigo-400" />, label: 'Nom', value: inputLastName || 'Non renseigné' },
                { icon: <Mail size={15} className="text-indigo-400" />, label: 'Email', value: user?.email },
                { icon: <Ruler size={15} className="text-indigo-400" />, label: 'Taille', value: profile?.height_cm ? `${profile.height_cm} cm` : 'Non renseignée' },
                { icon: <User size={15} className="text-indigo-400" />, label: 'Âge', value: profile?.age ? `${profile.age} ans` : 'Non renseigné' },
                { icon: <User size={15} className="text-indigo-400" />, label: 'Genre', value: profile?.gender === 'homme' ? 'Homme' : profile?.gender === 'femme' ? 'Femme' : 'Non renseigné' },
                { icon: <Target size={15} className="text-indigo-400" />, label: 'Objectif', value: profile?.weight_goal_kg ? `${profile.weight_goal_kg} kg` : 'Non défini' },
              ].map(({ icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 py-3">
                  <div className="w-8 h-8 bg-gray-800 rounded-xl flex items-center justify-center shrink-0">
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-500 text-xs">{label}</p>
                    <p className="text-white text-sm truncate">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        {pushSupported && (
          <div className="bg-gray-900 rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {subscribed ? <Bell size={16} className="text-indigo-400" /> : <BellOff size={16} className="text-gray-500" />}
                <h2 className="text-white font-semibold">Notifications</h2>
              </div>
              <button
                onClick={handleToggleNotif}
                disabled={pushLoading}
                className={`relative w-12 h-6 rounded-full transition-colors ${subscribed ? 'bg-indigo-600' : 'bg-gray-700'} disabled:opacity-50`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${subscribed ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {subscribed && (
              <>
                <div>
                  <label className="text-gray-400 text-xs mb-1.5 block">Heure du rappel quotidien</label>
                  <input
                    type="time"
                    value={notifTime}
                    onChange={e => {
                      setNotifTime(e.target.value)
                      saveNotifSettings(true, e.target.value, notifInactivityDays)
                    }}
                    className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 w-full"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1.5 block">
                    Rappel si inactif depuis {notifInactivityDays} jour{notifInactivityDays > 1 ? 's' : ''}
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 5, 7].map(d => (
                      <button
                        key={d}
                        onClick={() => {
                          setNotifInactivityDays(d)
                          saveNotifSettings(true, notifTime, d)
                        }}
                        className={`flex-1 py-2 rounded-xl text-sm transition-colors ${notifInactivityDays === d ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                      >
                        {d}j
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {!subscribed && (
              <p className="text-gray-500 text-xs leading-relaxed">
                Active les notifications pour recevoir des rappels d'entraînement et des alertes si tu n'as pas entraîné depuis plusieurs jours.
              </p>
            )}
          </div>
        )}

        <Medals />

        {/* Déconnexion */}
        <button
          onClick={() => setConfirmLogout(true)}
          className="flex items-center justify-center gap-2 w-full bg-gray-900 hover:bg-red-950 text-red-400 font-semibold py-4 rounded-2xl transition-colors"
        >
          <LogOut size={18} />
          Se déconnecter
        </button>

      </div>

      {confirmLogout && (
        <ConfirmModal
          title="Se déconnecter ?"
          description="Tu devras te reconnecter pour accéder à ton compte."
          confirmLabel="Se déconnecter"
          variant="logout"
          onConfirm={() => { setConfirmLogout(false); handleLogout() }}
          onCancel={() => setConfirmLogout(false)}
        />
      )}
    </div>
  )
}
