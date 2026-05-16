import Stripe from 'stripe'

function getSiteUrl() {
  return (
    process.env.SITE_URL ||
    process.env.VITE_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    'http://localhost:5173'
  )
}

/** @returns {Promise<{ status: number, body: object }>} */
export async function handleCreateCheckoutSession({ body }) {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    return { status: 500, body: { message: 'STRIPE_SECRET_KEY is not configured' } }
  }

  const { priceId, examinerId, tier } = body || {}
  if (!priceId || !examinerId) {
    return { status: 400, body: { message: 'priceId and examinerId are required' } }
  }

  const stripe = new Stripe(key)
  const siteUrl = getSiteUrl()

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { examinerId, tier: tier || '' },
    success_url: `${siteUrl}/upgrade-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/`,
  })

  return { status: 200, body: { url: session.url } }
}
