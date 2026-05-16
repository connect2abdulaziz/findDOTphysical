import { handleCreateCheckoutSession } from './lib/createCheckoutSessionCore.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const result = await handleCreateCheckoutSession({ body })
    return res.status(result.status).json(result.body)
  } catch (err) {
    console.error('Stripe error:', err)
    return res.status(500).json({ message: err.message })
  }
}
