import { supabase } from './supabase'

const AUTH_ERRORS = [
  'JWT expired',
  'Invalid JWT',
  'session_not_found',
  'User not found',
]

/**
 * Gère une erreur Supabase de façon centralisée.
 * @param {object} error - L'erreur retournée par Supabase
 * @param {function} toast - La fonction toast du contexte
 * @param {string} fallbackMessage - Message affiché si l'erreur n'est pas reconnue
 */
export async function handleSupabaseError(error, toast, fallbackMessage = 'Une erreur est survenue.') {
  if (!error) return

  const msg = error.message || ''

  // Session expirée → déconnexion propre
  if (AUTH_ERRORS.some(e => msg.includes(e))) {
    toast?.error('Ta session a expiré. Reconnecte-toi.')
    await supabase.auth.signOut()
    return
  }

  // Erreur réseau
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('fetch')) {
    toast?.error('Connexion impossible. Vérifie ton réseau.')
    return
  }

  // Erreur de droits
  if (msg.includes('permission denied') || msg.includes('not authorized') || error.code === '42501') {
    toast?.error('Accès refusé.')
    return
  }

  // Fallback
  toast?.error(fallbackMessage)
  console.error('[Supabase error]', error)
}
