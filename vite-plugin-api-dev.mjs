import { loadEnv } from 'vite'

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function readBody(req) {
  return readRawBody(req).then((buf) => buf.toString())
}

function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
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
  sendJson(res, result.status, result.body)
}

/** Serves /api/* routes during `vite` dev (same logic as Vercel serverless functions). */
export function apiDevPlugin() {
  return {
    name: 'api-dev',
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.root, '')
      Object.assign(process.env, env)

      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0]

        try {
          if (path === '/api/admin-examiners') {
            const { handleAdminExaminers } = await import('./api/lib/adminExaminersCore.js')
            const url = new URL(req.url, 'http://localhost')
            const query = Object.fromEntries(url.searchParams)
            let body = {}
            if (req.method !== 'GET' && req.method !== 'HEAD') {
              const raw = await readBody(req)
              if (raw) body = JSON.parse(raw)
            }

            const result = await handleAdminExaminers({
              method: req.method,
              headers: req.headers,
              query,
              body,
            })

            if (result.status === 204) {
              res.statusCode = 204
              res.end()
              return
            }
            sendJson(res, result.status, result.body)
            return
          }

          if (path === '/api/create-checkout-session') {
            if (req.method !== 'POST') {
              sendJson(res, 405, { message: 'Method not allowed' })
              return
            }

            const raw = await readBody(req)
            const body = raw ? JSON.parse(raw) : {}
            const { handleCreateCheckoutSession } = await import(
              './api/lib/createCheckoutSessionCore.js'
            )
            const result = await handleCreateCheckoutSession({ body })
            sendJson(res, result.status, result.body)
            return
          }

          if (path === '/api/stripe-webhook') {
            if (req.method !== 'POST') {
              res.statusCode = 405
              res.end()
              return
            }

            const rawBody = await readRawBody(req)
            const { handleStripeWebhook } = await import('./api/lib/stripeWebhookCore.js')
            const result = await handleStripeWebhook({
              rawBody,
              signature: req.headers['stripe-signature'],
            })
            sendResult(res, result)
            return
          }

          next()
        } catch (err) {
          console.error(`[api-dev] ${path}:`, err)
          sendJson(res, 500, { message: err.message })
        }
      })
    },
  }
}
