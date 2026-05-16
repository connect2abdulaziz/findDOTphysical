import { handleAdminExaminers } from './lib/adminExaminersCore.js'

export default async function handler(req, res) {
  try {
    const body =
      typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}

    const result = await handleAdminExaminers({
      method: req.method,
      headers: req.headers,
      query: req.query || {},
      body,
    })

    if (result.status === 204) return res.status(204).end()
    return res.status(result.status).json(result.body)
  } catch (err) {
    console.error('admin-examiners error:', err)
    return res.status(500).json({ message: err.message })
  }
}
