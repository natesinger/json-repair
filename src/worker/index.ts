// Cloudflare Worker for API endpoints
// This file is required for Cloudflare CD functionality

interface Env {
  // Add your environment variables here
}

// Simple API response without external dependencies
const app = {
  fetch: (request: Request, _env: Env, _ctx: any) => {
    const url = new URL(request.url)
    
    if (url.pathname === '/api/') {
      return new Response(JSON.stringify({ name: "Cloudflare" }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    return new Response('Not Found', { status: 404 })
  }
}

export default app
