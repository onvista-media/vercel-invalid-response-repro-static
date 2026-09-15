import React from 'react'
import type { GetServerSideProps } from 'next'

// Simulates a hot page whose backend occasionally fails: the page is fine in
// even UTC minutes and returns notFound in odd UTC minutes. Both responses are
// cacheable for 60s, so a CDN revalidation will eventually receive the
// (invalid) notFound render for a key that previously held a valid entry.
const CACHE_CONTROL = 'max-age=60, stale-while-revalidate=10, public'

type Props = { slug: string; renderedAt: string }

export const getServerSideProps: GetServerSideProps<Props> = async ({ params, res }) => {
  const slug = String(params?.slug ?? '')
  const now = new Date()
  res.setHeader('Cache-Control', CACHE_CONTROL)

  if (now.getUTCMinutes() % 2 === 1) {
    return { notFound: true }
  }

  return {
    props: { slug, renderedAt: now.toISOString() }
  }
}

export default function Flaky({ slug, renderedAt }: Props) {
  return (
    <main>
      <h1>Flaky {slug}</h1>
      <p>Rendered at {renderedAt} (even minute, healthy)</p>
    </main>
  )
}
