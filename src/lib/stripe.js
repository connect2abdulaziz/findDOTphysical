// Stripe Checkout Integration (Option B)
// Examiners are redirected to Stripe Checkout and webhook updates tier.

export const STRIPE_PRICES = {
  featured: import.meta.env.VITE_STRIPE_PRICE_FEATURED, // e.g. price_xxx  $49/mo
  premium: import.meta.env.VITE_STRIPE_PRICE_PREMIUM,   // e.g. price_xxx  $99/mo
}

/**
 * Redirect the browser to Stripe Checkout for the given tier.
 * examinerId is stored in metadata so the webhook knows which row to update.
 */
export async function redirectToCheckout({ tier, examinerId }) {
  const priceId = STRIPE_PRICES[tier]
  if (!priceId) throw new Error(`No Stripe price configured for tier: ${tier}`)

  const res = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceId, examinerId, tier }),
  })

  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new Error('Checkout API not reachable. Restart `npm run dev` after pulling latest changes.')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || 'Failed to create checkout session')
  }

  const { url } = await res.json()
  window.location.href = url
}
