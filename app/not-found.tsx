import React from 'react'

// CONTROL VARIANT: identical app, but the not-found tree does not read
// request headers, so /_not-found is fully static (no partial prerender,
// nothing streamed at request time).
export default function NotFound() {
  return (
    <>
      <header>Site header</header>
      <main>
        <h1>404 - page not found</h1>
      </main>
      <footer>Site footer</footer>
    </>
  )
}
