import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// In development, requests to /api/<name> run the matching file in /api (the same handlers that
// run as serverless functions on Vercel), with small req/res helpers so the code is identical.
function apiDev() {
  return {
    name: 'api-dev',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res, next) => {
        const name = (req.url || '').split('?')[0].replace(/^\/+/, '').replace(/[^a-z0-9-]/gi, '')
        if (!name) return next()
        try {
          const mod = await server.ssrLoadModule(`/api/${name}.js`)
          let raw = ''
          for await (const chunk of req) raw += chunk
          req.body = raw ? JSON.parse(raw) : {}
          res.status = (code) => ((res.statusCode = code), res)
          res.json = (data) => {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(data))
          }
          await mod.default(req, res)
        } catch (err) {
          console.error(err)
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'Dev API error' }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // make .env values (GEMINI_API_KEY) available to the API handlers in dev
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))
  return {
    plugins: [react(), apiDev()],
    // host: true also serves the site on the local Wi-Fi network, so a phone can open it
    server: { port: 5180, host: true },
    build: { chunkSizeWarningLimit: 1200 },
  }
})
