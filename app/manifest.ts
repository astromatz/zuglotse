import type { MetadataRoute } from 'next'

export const dynamic = 'force-static'

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Zuglotse – Dein Schachkompass',
    short_name: 'Zuglotse',
    description: 'Schachstellungen analysieren mit Stockfish und deutschen Erklärungen.',
    start_url: `${base}/`,
    scope: `${base}/`,
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#218355',
    lang: 'de',
    icons: [
      { src: `${base}/icon-192.png?v=2`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `${base}/icon-512.png?v=2`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: `${base}/icon-512.png?v=2`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: `${base}/favicon.svg?v=2`, sizes: 'any', type: 'image/svg+xml' },
    ],
  }
}
