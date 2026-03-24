import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { User, Mail, Ruler, Target, LogOut, Pencil, Check } from 'lucide-react'
import Medals from '../../components/profile/Medals'

export default function ProfilePage() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [editing, setEditing] = useState(false)
  const [inputName, setInputName] = useState('')
  const [inputHeight, setInputHeight] = useState('')
  const [inputGoal, setInputGoal] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    setInputName(user?.user_metadata?.full_name || '')

    const { data: profileData } = await supabase
      .from('user_profile')
      .select('*')
      .eq('user_id', user.id)
      .single()

    setProfile(profileData)
    setInputHeight(profileData?.height_cm?.toString() || '')
    setInputGoal(profileData?.weight_goal_kg?.toString() || '')
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleSave = async () => {
    setSaving(true)

    await supabase.auth.updateUser({
      data: { full_name: inputName.trim() }
    })

    await supabase.from('user_profile').upsert({
      user_id: user.id,
      height_cm: parseFloat(inputHeight) || null,
      weight_goal_kg: parseFloat(inputGoal) || null,
    }, { onConflict: 'user_id' })

    setSaving(false)
    setEditing(false)
    fetchData()
  }

  const handleLogout = async () => {
    if (!confirm('Se déconnecter ?')) return
    await supabase.auth.signOut()
  }

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-gray-950">
      <p className="text-white">Chargement...</p>
    </div>
  )

  const initials = inputName
    ? inputName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0].toUpperCase()

  return (
    <div className="p-4 pb-24 bg-gray-950 min-h-screen flex flex-col gap-4">

      {/* Header avatar */}
      <div className="flex flex-col items-center pt-4 pb-2 gap-3">
        <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center">
          <span className="text-white text-2xl font-bold">{initials}</span>
        </div>
        <div className="text-center">
          <h1 className="text-xl font-bold text-white">
            {user?.user_metadata?.full_name || 'Mon profil'}
          </h1>
          <p className="text-gray-400 text-sm">{user?.email}</p>
        </div>
      </div>

      {/* Infos */}
      <div className="bg-gray-900 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">Informations</h2>
          <button
            onClick={() => setEditing(!editing)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            {editing ? <Check size={18} /> : <Pencil size={18} />}
          </button>
        </div>

        {editing ? (
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Nom complet</label>
              <input
                type="text"
                value={inputName}
                onChange={e => setInputName(e.target.value)}
                placeholder="ex: Jean Dupont"
                className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 w-full"
                autoFocus
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Taille (cm)</label>
              <input
                type="number"
                value={inputHeight}
                onChange={e => setInputHeight(e.target.value)}
                placeholder="ex: 178"
                className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 w-full"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Objectif de poids (kg)</label>
              <input
                type="number"
                step="0.5"
                value={inputGoal}
                onChange={e => setInputGoal(e.target.value)}
                placeholder="ex: 75"
                className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 w-full"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {saving ? 'Enregistrement...' : 'Sauvegarder'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gray-800 rounded-xl flex items-center justify-center">
                <User size={16} className="text-indigo-400" />
              </div>
              <div>
                <p className="text-gray-400 text-xs">Nom</p>
                <p className="text-white text-sm">
                  {user?.user_metadata?.full_name || 'Non renseigné'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gray-800 rounded-xl flex items-center justify-center">
                <Mail size={16} className="text-indigo-400" />
              </div>
              <div>
                <p className="text-gray-400 text-xs">Email</p>
                <p className="text-white text-sm">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gray-800 rounded-xl flex items-center justify-center">
                <Ruler size={16} className="text-indigo-400" />
              </div>
              <div>
                <p className="text-gray-400 text-xs">Taille</p>
                <p className="text-white text-sm">
                  {profile?.height_cm ? `${profile.height_cm} cm` : 'Non renseignée'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gray-800 rounded-xl flex items-center justify-center">
                <Target size={16} className="text-indigo-400" />
              </div>
              <div>
                <p className="text-gray-400 text-xs">Objectif de poids</p>
                <p className="text-white text-sm">
                  {profile?.weight_goal_kg ? `${profile.weight_goal_kg} kg` : 'Non défini'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <Medals />
      {/* Déconnexion */}
      <button
        onClick={handleLogout}
        className="flex items-center justify-center gap-2 w-full bg-gray-900 hover:bg-red-950 text-red-400 font-semibold py-4 rounded-2xl transition-colors"
      >
        <LogOut size={18} />
        Se déconnecter
      </button>
    </div>
  )
}