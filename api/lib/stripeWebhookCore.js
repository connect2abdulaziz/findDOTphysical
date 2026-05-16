import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured')
  return new Stripe(key)
}

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase service role credentials are not configured')
  return createClient(url, key)
}

/** @returns {Promise<{ status: number, body?: string | object }>} */
export async function handleStripeWebhook({ rawBody, signature }) {
  if (!signature) {
    return { status: 400, body: 'Webhook Error: Missing stripe-signature header' }
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    return { status: 500, body: { message: 'STRIPE_WEBHOOK_SECRET is not configured' } }
  }

  const stripe = getStripe()
  const supabase = getSupabase()

  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret)
  } catch (err) {
    console.error('Webhook signature error:', err.message)
    return { status: 400, body: `Webhook Error: ${err.message}` }
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const { examinerId, tier } = session.metadata || {}

    if (examinerId && tier) {
      const { error } = await supabase
        .from('examiners')
        .update({
          tier,
          active: true,
          stripe_subscription_id: session.subscription || null,
        })
        .eq('id', examinerId)

      if (error) {
        console.error('Supabase update error:', error)
        return { status: 500, body: { message: 'DB update failed' } }
      }
      console.log(`✅ Examiner ${examinerId} upgraded to ${tier}`)
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object
    const { data: examiner } = await supabase
      .from('examiners')
      .select('id')
      .eq('stripe_subscription_id', subscription.id)
      .single()

    if (examiner) {
      await supabase.from('examiners').update({ tier: 'free' }).eq('id', examiner.id)
      console.log(`⬇️ Examiner ${examiner.id} downgraded to free (sub cancelled)`)
    }
  }

  return { status: 200, body: { received: true } }
}
