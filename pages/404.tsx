import React from 'react'

// Present to mirror production. Next.js 16 ignores it for pages-router
// notFound results once an app/not-found.tsx exists (base-server.js:
// "Use the not-found entry in app directory").
export default function Custom404() {
  return (
    <main>
      <h1>404 - pages router version (never served)</h1>
    </main>
  )
}
