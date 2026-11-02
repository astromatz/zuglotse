import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { ChunkLoadErrorHandler } from '@/components/chunk-load-error-handler'

export const metadata = {
  title: 'Zuglotse – Dein Schachkompass',
  applicationName: 'Zuglotse',
  description: 'Dein nächster Zug. Klar vor Augen. Analysiere Schachstellungen mit Stockfish – ohne KI, API-Schlüssel oder Registrierung.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
  appleWebApp: { title: 'Zuglotse' },
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
