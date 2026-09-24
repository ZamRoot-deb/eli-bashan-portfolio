// Throwaway static file server for verifying a Vite `dist/` build. No dependencies.
// Serves `dir` on 127.0.0.1 with an ephemeral port. No directory listing, path-traversal safe.
import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'

export const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.pdf': 'application/pdf',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
}

export function mimeFor(filePath) {
  return MIME[extname(filePath).toLowerCase()] || 'application/octet-stream'
}

/**
 * Start a static server rooted at `dir`.
 * @returns {Promise<{url:string, close():Promise<void>}>}
 */
export async function start(dir) {
  const root = resolve(dir)
  const server = createServer(async (req, res) => {
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { Allow: 'GET, HEAD' })
        res.end('Method not allowed')
        return
      }
      const rawPath = (req.url || '/').split('?')[0].split('#')[0]
      let rel
      try {
        rel = decodeURIComponent(rawPath).replace(/^\/+/, '')
      } catch {
        res.writeHead(400)
        res.end('Bad request')
        return
      }
      if (rel === '') rel = 'index.html'
      const filePath = resolve(root, rel)
      // path-traversal guard: resolved path must stay inside root
      if (filePath !== root && !filePath.startsWith(root + sep)) {
        res.writeHead(403)
        res.end('Forbidden')
        return
      }
      let st
      try {
        st = await stat(filePath)
      } catch {
        res.writeHead(404)
        res.end('Not found')
        return
      }
      if (st.isDirectory()) {
        // no directory listing
        res.writeHead(404)
        res.end('Not found')
        return
      }
      const headers = { 'Content-Type': mimeFor(filePath), 'Content-Length': st.size }
      res.writeHead(200, headers)
      if (req.method === 'HEAD') {
        res.end()
        return
      }
      const stream = createReadStream(filePath)
      stream.on('error', () => {
        if (!res.headersSent) res.writeHead(500)
        res.end()
      })
      stream.pipe(res)
    } catch {
      if (!res.headersSent) res.writeHead(500)
      res.end('Server error')
    }
  })
  await new Promise((res, rej) => {
    server.once('error', rej)
    server.listen(0, '127.0.0.1', res)
  })
  const { port } = server.address()
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise(res => server.close(() => res())),
  }
}
