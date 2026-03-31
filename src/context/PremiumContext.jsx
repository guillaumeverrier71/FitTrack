import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const PremiumContext = createContext(null)

export function PremiumProvider({ children }) {
  const [plan, setPlan] = useState(null) // null = loading, 'free' | 'monthly' | 'yearly'
  const [premiumUntil, setPremiumUntil] = useState(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setPlan('free'); return }

      const { data: profile } = await supabase
        .from('user_profile')
        .select('plan, premium_until')
        .eq('user_id', user.id)
        .single()

      const until = profile?.premium_until ? new Date(profile.premium_until) : null
      const active = until && until > new Date()

      if (active) {
        setPlan(profile.plan || 'monthly')
        setPremiumUntil(until)
      } else {
        setPlan('free')
      }
    }
    load()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => load())
    return () => subscription.unsubscribe()
  }, [])

  const isPremium = plan === 'monthly' || plan === 'yearly'

  // Appelé par le système de paiement externe (RevenueCat, Stripe, etc.)
  const activatePremium = async (selectedPlan, durationDays) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const until = new Date()
    until.setDate(until.getDate() + durationDays)
    await supabase.from('user_profile').upsert({
      user_id: user.id,
      plan: selectedPlan,
      premium_until: until.toISOString(),
    }, { onConflict: 'user_id' })
    setPlan(selectedPlan)
    setPremiumUntil(until)
  }

  return (
    <PremiumContext.Provider value={{ plan, isPremium, premiumUntil, activatePremium }}>
      {children}
    </PremiumContext.Provider>
  )
}

export function usePremium() {
  return useContext(PremiumContext)
}
