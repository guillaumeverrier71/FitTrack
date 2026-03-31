import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14'

serve(async (req) => {
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')!
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error('Webhook signature failed:', err.message)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey)

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.metadata?.user_id
    const plan = session.metadata?.plan

    if (userId && plan) {
      const durationDays = plan === 'yearly' ? 365 : 31
      const until = new Date()
      until.setDate(until.getDate() + durationDays)

      await admin.from('user_profile').upsert({
        user_id: userId,
        plan,
        premium_until: until.toISOString(),
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
      }, { onConflict: 'user_id' })

      console.log(`Activated ${plan} for user ${userId}`)
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    const userId = sub.metadata?.user_id

    if (userId) {
      await admin.from('user_profile').update({
        plan: 'free',
        premium_until: null,
        stripe_subscription_id: null,
      }).eq('user_id', userId)

      console.log(`Revoked premium for user ${userId}`)
    }
  }

  if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object as Stripe.Invoice
    const sub = await stripe.subscriptions.retrieve(invoice.subscription as string)
    const userId = sub.metadata?.user_id
    const plan = sub.metadata?.plan

    if (userId && plan) {
      const durationDays = plan === 'yearly' ? 365 : 31
      const until = new Date()
      until.setDate(until.getDate() + durationDays)

      await admin.from('user_profile').update({
        plan,
        premium_until: until.toISOString(),
      }).eq('user_id', userId)

      console.log(`Renewed ${plan} for user ${userId}`)
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 })
})
