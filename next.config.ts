import type { NextConfig } from 'next'

// Mirrors the production setup of www.onvista.de: pages router + app router
// side by side, cacheComponents enabled.
const nextConfig: NextConfig = {
  cacheComponents: true,
  typescript: {
    ignoreBuildErrors: false
  }
}

export default nextConfig
