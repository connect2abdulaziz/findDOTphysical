import { handleStripeWebhook } from './lib/stripeWebhookCore.js'

// Disable body parsing so Stripe can verify the raw body signature (Vercel)
export const config = { api: { bodyParser: false } }

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function sendResult(res, result) {
  res.statusCode = result.status
  if (result.body === undefined) {
    res.end()
    return
  }
  if (typeof result.body === 'string') {
    res.end(result.body)
    return
  }
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(result.body))
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const rawBody = await getRawBody(req)
    const result = await handleStripeWebhook({
      rawBody,
      signature: req.headers['stripe-signature'],
    })
    sendResult(res, result)
  } catch (err) {
    console.error('Webhook error:', err)
    res.status(500).json({ message: err.message })
  }
}
