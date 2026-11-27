import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { createRequire } from 'node:module'
import Razorpay from 'razorpay'
import { LAZY_ASSETS_CACHE, MEDIA_CACHE } from './src/lib/pwaCaches.js'

const requireCjs = createRequire(path.join(process.cwd(), 'vite.config.js'))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    // AdSense ids are public by design (they ship in the rendered ad tag), so
    // expose ADSENSE_* to the browser without a VITE_ prefix. Never use this
    // prefix for an API key or any other secret.
    envPrefix: ['VITE_', 'ADSENSE_'],
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['images/pwa-icon-192x192.png', 'images/pwa-icon-512x512.png', 'images/pwa-icon.svg'],
        manifest: {
          name: 'NEURAL AURORA - Techhackontime999',
          short_name: 'NEURAL AURORA',
          description: 'Full-Stack Developer & UI/UX Architect — crafting neural-inspired digital experiences.',
          theme_color: '#080C14',
          background_color: '#080C14',
          display: 'standalone',
          display_override: ['window-controls-overlay', 'standalone'],
          scope: '/',
          start_url: '/',
          orientation: 'portrait-primary',
          lang: 'en',
          categories: ['portfolio', 'developer', 'technology'],
          shortcuts: [
            {
              name: 'Projects',
              short_name: 'Projects',
              description: 'View projects',
              url: '/#projects',
            },
            {
              name: 'Contact',
              short_name: 'Contact',
              description: 'Get in touch',
              url: '/#contact',
            },
          ],
          screenshots: [
            {
              src: '/images/pwa-icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'NEURAL AURORA',
            },
          ],
          icons: [
            {
              src: '/images/pwa-icon-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/images/pwa-icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: '/images/pwa-icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          // Navigations to API/OAuth endpoints must reach the server, not the
          // offline SPA shell. Without this denylist the service worker serves
          // index.html for /api/mcp/* and /.well-known/*, producing a React
          // 404 instead of the OAuth response.
          navigateFallbackDenylist: [
            /^\/api(?:\/|$)/,
            /^\/\.well-known(?:\/|$)/,
          ],
          // Only the offline application shell is precached. Route chunks,
          // large imagery, hero video and 3D vendors are fetched on demand and
          // cached at runtime, so installing the SW never downloads ~20 MiB.
          globPatterns: [
            'index.html',
            'registerSW.js',
            'assets/index-*.js',
            'assets/index-*.css',
            'images/neural_aurora_logo.svg',
          ],
          // Unchanged limit: a guard, not a target. Nothing above this size can
          // enter the precache; lazy assets are bounded by runtimeCaching.
          maximumFileSizeToCacheInBytes: 4000000,
          runtimeCaching: [
            {
              // Hashed, content-addressed chunks are immutable. CacheFirst
              // gives previously visited routes an offline experience and lets
              // old tabs finish loading chunks that a new deploy removed.
              urlPattern: ({ url }) =>
                url.origin === self.location.origin &&
                /\/assets\/[^/]+\.(?:js|css)$/i.test(url.pathname),
              handler: 'CacheFirst',
              options: {
                cacheName: LAZY_ASSETS_CACHE,
                expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Public, same-origin page content only. API/auth/store/download
              // routes never match these paths, so private data is not cached.
              urlPattern: ({ url }) =>
                url.origin === self.location.origin &&
                /(?:\/images\/[^/]+\.(?:png|jpe?g|webp|svg)|\/hero_(?:dark|light)\.mp4|\/resume\.pdf)$/i.test(
                  url.pathname
                ),
              handler: 'CacheFirst',
              options: {
                cacheName: MEDIA_CACHE,
                expiration: { maxEntries: 12, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/api\.fontshare\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'fontshare',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/prod\.spline\.design\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'spline-assets',
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 },
                networkTimeoutSeconds: 5,
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            // The previous crm-neural-aurora NetworkFirst rule was removed: it
            // could cache admin/CRM GET responses and nothing in the app needs
            // it. Never cache Supabase/API/auth/order/entitlement responses.
          ],
        },
      }),
      {
        name: 'api-routes',
        configureServer(server) {
          server.middlewares.use('/api/create-order', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Method not allowed' }))
              return
            }
            let body = ''
            req.on('data', chunk => body += chunk)
            req.on('end', async () => {
              try {
                const { amount, currency = 'INR', notes = {}, receipt } = JSON.parse(body)
                const razorpay = new Razorpay({
                  key_id: env.RAZORPAY_KEY_ID,
                  key_secret: env.RAZORPAY_KEY_SECRET,
                })
                const order = await razorpay.orders.create({
                  amount,
                  currency,
                  receipt: receipt || `receipt_${Date.now()}`,
                  notes: notes || {},
                })
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(order))
              } catch (err) {
                console.error('[API] Order creation failed:', err)
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Failed to create order' }))
              }
            })
          })

          server.middlewares.use('/api/mithi-chat', async (req, res) => {
            if (req.method !== 'GET' && req.method !== 'POST') {
              res.statusCode = 405
              res.setHeader('Allow', 'GET, POST')
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Method not allowed' }))
              return
            }
            try {
              const mithiHandler = requireCjs('./api/mithi-chat.js')
              // Adapter for Vercel handler style in connect middleware
              res.status = (code) => {
                res.statusCode = code
                return res
              }
              res.json = (data) => {
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(data))
                return res
              }
              if (req.method === 'POST') {
                let raw = ''
                await new Promise((resolve) => {
                  req.on('data', (chunk) => {
                    raw += chunk
                  })
                  req.on('end', resolve)
                })
                try {
                  req.body = raw ? JSON.parse(raw) : {}
                } catch {
                  req.body = null
                }
              } else {
                req.body = null
              }
              await mithiHandler(req, res)
            } catch (err) {
              console.error('[API] Mithi chat error:', err)
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Mithi is unavailable right now.', code: 'mithi_error' }))
            }
          })

          server.middlewares.use('/api/razorpay-webhook', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Method not allowed' }))
              return
            }
            try {
              const webhookHandler = requireCjs('./api/razorpay-webhook.js')
              // Adapter for Vercel handler style in connect middleware
              req.headers = req.headers || {}
              res.status = (code) => {
                res.statusCode = code
                return res
              }
              res.json = (data) => {
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(data))
              }
              await webhookHandler(req, res)
            } catch (err) {
              console.error('[API] Webhook error:', err)
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Webhook processing failed' }))
            }
          })

          // Dev parity for the remaining serverless routes. Without this,
          // /api/license-document falls through to Vite's SPA handler and the
          // library reports a generic download error. The three routes above
          // predate this bridge and keep their existing behaviour.
          // The two licence URLs are aliases of one combined function so the
          // deployed app stays inside Vercel's 12-function Hobby limit.
          const licenseActionRoutes = {
            'license-document': 'document',
            'license-verify': 'verify',
          }
          const bridgedRoutes = new Set([
            'ai',
            'admin-access-link',
            'admin-delete-orders',
            'admin-license',
            'admin-reconcile-order',
            'customer-signin-link',
            'download',
            'license',
            'license-document',
            'license-verify',
            'order-status',
          ])

          server.middlewares.use('/api', async (req, res, next) => {
            const name = String(req.url || '')
              .split('?')[0]
              .split('/')
              .filter(Boolean)[0]
            if (!bridgedRoutes.has(name)) return next()

            // Handlers read process.env directly; Vite only exposes VITE_*
            // values to the browser, so mirror the loaded .env for them.
            for (const [key, value] of Object.entries(env)) {
              if (process.env[key] === undefined) process.env[key] = value
            }

            req.query = Object.fromEntries(
              new URL(req.url || '/', 'http://localhost').searchParams.entries()
            )

            const licenseAction = licenseActionRoutes[name]
            if (licenseAction) req.query.action = licenseAction
            const targetName = licenseAction ? 'license' : name

            if (req.method !== 'GET' && req.method !== 'HEAD') {
              let raw = ''
              try {
                raw = await new Promise((resolve, reject) => {
                  req.on('data', (chunk) => { raw += chunk })
                  req.on('end', () => resolve(raw))
                  req.on('error', reject)
                })
              } catch {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Invalid request body' }))
                return
              }
              try {
                req.body = raw ? JSON.parse(raw) : {}
              } catch {
                req.body = null
              }
            }

            // Minimal Vercel-response adapter for the real handler.
            res.status = (code) => {
              res.statusCode = code
              return res
            }
            res.json = (data) => {
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(data))
              return res
            }
            res.send = (data) => {
              res.end(data)
              return res
            }

            try {
              await requireCjs(`./api/${targetName}.js`)(req, res)
            } catch (err) {
              console.error(`[API] ${name} failed:`, err)
              if (res.headersSent) {
                res.end()
              } else {
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'API request failed' }))
              }
            }
          })
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
      dedupe: ['three'],
    },
    optimizeDeps: {
      include: ['three', '@react-three/fiber', '@react-three/drei'],
    },
  }
})
