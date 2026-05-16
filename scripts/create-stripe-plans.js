#!/usr/bin/env node
/**
 * Create Featured ($49/mo) and Premium ($99/mo) Stripe subscription prices.
 *
 * Usage:
 *   node scripts/create-stripe-plans.js          # create or reuse existing
 *   node scripts/create-stripe-plans.js --force  # always create new products/prices
 *
 * Requires STRIPE_SECRET_KEY in .env (use test key sk_test_... for sandbox).
 */

const fs = require('fs')
const path = require('path')
const Stripe = require('stripe')

const APP = 'finddotphysical'

const PLANS = [
  {
    tier: 'featured',
    envKey: 'VITE_STRIPE_PRICE_FEATURED',
    name: 'FindDOTPhysical — Featured Listing',
    description:
      'Featured DOT examiner listing: priority placement and highlight badge ($49/month).',
    amount: 4900,
  },
  {
    tier: 'premium',
    envKey: 'VITE_STRIPE_PRICE_PREMIUM',
    name: 'FindDOTPhysical — Premium Listing',
    description:
      'Premium DOT examiner listing: top of search results and maximum visibility ($99/month).',
    amount: 9900,
  },
]

function loadDotEnv() {
  const envPath = path.join(__dirname, '..', '.env')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = val
  }
}

async function findExisting(stripe, plan) {
  const products = await stripe.products.list({ limit: 100, active: true })
  const product = products.data.find(
    (p) => p.metadata?.tier === plan.tier && p.metadata?.app === APP
  )
  if (!product) return null

  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 20 })
  const price = prices.data.find(
    (p) =>
      p.type === 'recurring' &&
      p.recurring?.interval === 'month' &&
      p.unit_amount === plan.amount &&
      p.currency === 'usd'
  )

  return price ? { product, price } : null
}

async function createPlan(stripe, plan, force) {
  if (!force) {
    const existing = await findExisting(stripe, plan)
    if (existing) {
      console.log(`✓ ${plan.tier}: reusing price ${existing.price.id} (product ${existing.product.id})`)
      return existing.price
    }
  }

  const product = await stripe.products.create({
    name: plan.name,
    description: plan.description,
    metadata: { tier: plan.tier, app: APP },
  })

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: plan.amount,
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { tier: plan.tier, app: APP },
  })

  console.log(`✓ ${plan.tier}: created product ${product.id}, price ${price.id}`)
  return price
}

async function main() {
  loadDotEnv()

  const force = process.argv.includes('--force')
  const key = process.env.STRIPE_SECRET_KEY

  if (!key) {
    console.error('Error: STRIPE_SECRET_KEY is not set. Add it to .env and try again.')
    process.exit(1)
  }

  const stripe = new Stripe(key)
  const mode = key.startsWith('sk_live_') ? 'LIVE' : 'TEST'

  console.log(`Stripe mode: ${mode}${force ? ' (--force: creating new prices)' : ''}\n`)

  const results = {}

  for (const plan of PLANS) {
    const price = await createPlan(stripe, plan, force)
    results[plan.tier] = { envKey: plan.envKey, priceId: price.id, amount: plan.amount }
  }

  console.log('\n--- Copy into .env ---\n')
  for (const plan of PLANS) {
    const { envKey, priceId } = results[plan.tier]
    console.log(`${envKey}=${priceId}`)
  }

  console.log('\n--- Summary ---\n')
  for (const plan of PLANS) {
    const { priceId, amount } = results[plan.tier]
    console.log(`${plan.tier.padEnd(9)} $${(amount / 100).toFixed(0)}/mo  →  ${priceId}`)
  }

  console.log('\nAlso set these in Vercel production env vars if deploying.')
}

main().catch((err) => {
  console.error('Failed:', err.message)
  process.exit(1)
})
