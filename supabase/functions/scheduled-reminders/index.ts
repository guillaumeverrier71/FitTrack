import { createClient } from 'npm:@supabase/supabase-js'
import webpush from 'npm:web-push'

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:contact@fitnavigator.app'

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const now = new Date()
  // Heure courante HH:MM (UTC — ajuste selon ton timezone si besoin)
  const currentTime = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`

  // Utilisateurs avec rappels activés à cette heure exacte
  const { data: profiles } = await supabase
    .from('user_profile')
    .select('user_id, notif_time, notif_inactivity_days, display_name')
    .eq('notif_enabled', true)
    .eq('notif_time', currentTime)

  if (!profiles?.length) {
    return new Response(JSON.stringify({ sent: 0, reason: 'no users at this time' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let sent = 0

  for (const profile of profiles) {
    // Dernière séance terminée
    const { data: lastSession } = await supabase
      .from('workout_sessions')
      .select('finished_at')
      .eq('user_id', profile.user_id)
      .not('finished_at', 'is', null)
      .order('finished_at', { ascending: false })
      .limit(1)
      .single()

    const lastWorkout = lastSession?.finished_at ? new Date(lastSession.finished_at) : null
    const daysSince = lastWorkout
      ? Math.floor((now.getTime() - lastWorkout.getTime()) / (1000 * 60 * 60 * 24))
      : 999

    // Déjà entraîné aujourd'hui → skip
    if (daysSince === 0) continue

    const inactivityDays = profile.notif_inactivity_days || 2
    const firstName = profile.display_name?.split(' ')[0] || ''

    let title: string, body: string
    if (daysSince >= inactivityDays) {
      title = firstName ? `${firstName}, tu es toujours là ? 💪` : 'Toujours là ? 💪'
      body = daysSince === 1
        ? 'Tu n\'as pas encore entraîné aujourd\'hui. C\'est le bon moment !'
        : `Ça fait ${daysSince} jours. Ton corps attend !`
    } else {
      title = 'C\'est l\'heure ! 🏋️'
      body = 'Ta séance t\'attend. Allez, on y va !'
    }

    // Abonnements push de cet utilisateur
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', profile.user_id)

    for (const sub of (subs || [])) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title, body, url: '/workouts', tag: 'reminder' })
        )
        sent++
      } catch (err: any) {
        // Abonnement expiré (410) → supprimer
        if (err.statusCode === 410) {
          await supabase.from('push_subscriptions')
            .delete()
            .eq('user_id', profile.user_id)
            .eq('endpoint', sub.endpoint)
        }
      }
    }
  }

  return new Response(JSON.stringify({ sent }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
