import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { ChunkLoadErrorHandler } from '@/components/chunk-load-error-handler'

// Next.js setzt den basePath (GitHub Pages: /zuglotse) nicht automatisch vor Icon-URLs
// in den Metadaten. Ohne Präfix zeigen die Links auf die Domain-Wurzel und iOS lädt dort
// ein fremdes apple-touch-icon. ?v= erzwingt das Neuladen gecachter Icons.
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
const ICON_VERSION = '2'
const asset = (path: string) => `${base}${path}?v=${ICON_VERSION}`

export const metadata = {
  title: 'Zuglotse – Dein Schachkompass',
  applicationName: 'Zuglotse',
  description: 'Dein nächster Zug. Klar vor Augen. Analysiere Schachstellungen mit Stockfish – ohne KI, API-Schlüssel oder Registrierung.',
  icons: {
    icon: [
      { url: asset('/favicon.svg'), type: 'image/svg+xml' },
      { url: asset('/icon-192.png'), type: 'image/png', sizes: '192x192' },
    ],
    shortcut: asset('/favicon.svg'),
    apple: [{ url: asset('/apple-touch-icon.png'), sizes: '180x180', type: 'image/png' }],
  },
  manifest: asset('/manifest.webmanifest'),
  appleWebApp: { title: 'Zuglotse', capable: true, statusBarStyle: 'default' },
  openGraph: {
    title: 'Zuglotse – Dein Schachkompass',
    description: 'Stellung aufbauen. Beste Züge entdecken. Schach besser verstehen – mit Stockfish und deutschen Erklärungen.',
    locale: 'de_DE',
    siteName: 'Zuglotse',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Zuglotse – Dein Schachkompass',
    description: 'Dein nächster Zug. Klar vor Augen.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
          <ChunkLoadErrorHandler />
        </ThemeProvider>
      </body>
    </html>
  )
}
