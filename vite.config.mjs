import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import sitemap from 'vite-plugin-sitemap'
import { apiDevPlugin } from './vite-plugin-api-dev.mjs'

const cityRoutes = [
  '/oklahoma-city',
  '/tulsa',
  '/norman',
  '/lawton',
  '/edmond',
  '/broken-arrow',
  '/midwest-city',
]

export default defineConfig({
  plugins: [
    react(),
    apiDevPlugin(),
    sitemap({
      hostname: 'https://www.finddotphysical.com',
      dynamicRoutes: ['/', ...cityRoutes, '/get-listed'],
    }),
  ],
  server: {
    // Allow Stripe webhooks / tunnels (ngrok subdomain changes each session)
    allowedHosts: ['.ngrok-free.app', '.ngrok.io', '.ngrok.app'],
  },
})
