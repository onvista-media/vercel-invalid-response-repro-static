import React from 'react'
import type { GetServerSideProps } from 'next'

// Mirrors the production Cache-Control emitted by our snapshot pages.
const CACHE_CONTROL = 'max-age=300, stale-if-error=3600, stale-while-revalidate=10, public'

type Props = { slug: string; renderedAt: string }

export const getServerSideProps: GetServerSideProps<Props> = async ({ params, res }) => {
  const slug = String(params?.slug ?? '')
  res.setHeader('Cache-Control', CACHE_CONTROL)

  if (slug !== 'known') {
    // In production this branch is taken whenever the backend API answers 404
    // (or fails). Next.js renders app/not-found.tsx for this.
    return { notFound: true }
  }

  return {
    props: { slug, renderedAt: new Date().toISOString() }
  }
}

export default function Snapshot({ slug, renderedAt }: Props) {
  return (
    <main>
      <h1>Snapshot {slug}</h1>
      <p>Rendered at {renderedAt}</p>
    </main>
  )
}
