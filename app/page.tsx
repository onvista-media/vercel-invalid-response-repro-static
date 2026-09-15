import React from 'react'

export default function Home() {
  return (
    <main>
      <h1>INTERNAL_INVALID_RESPONSE reproduction</h1>
      <ul>
        <li>
          <a href="/snapshot/known">/snapshot/known</a> - pages router, getServerSideProps returns props (200)
        </li>
        <li>
          <a href="/snapshot/unknown">/snapshot/unknown</a> - pages router, getServerSideProps returns notFound (expected 404)
        </li>
        <li>
          <a href="/flaky/dax">/flaky/dax</a> - 200 in even minutes, notFound in odd minutes (cache key poisoning)
        </li>
      </ul>
      <p>See README.md for the curl commands.</p>
    </main>
  )
}
