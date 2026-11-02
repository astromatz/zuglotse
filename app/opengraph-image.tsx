import { ImageResponse } from 'next/og'

export const dynamic = 'force-static'
export const alt = 'Zuglotse – Dein nächster Zug. Klar vor Augen.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '64px 80px', background: '#f7f9f8', color: '#101413', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 58, height: 58, background: 'hsl(152, 60%, 32%)', borderRadius: 18 }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.7"><circle cx="12" cy="12" r="9" /><path d="m16 8-2.5 5.5L8 16l2.5-5.5Z" /></svg>
        </div>
        <div style={{ fontSize: 34, fontWeight: 700 }}>Zuglotse.</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 65, fontSize: 76, fontWeight: 700, letterSpacing: '-3px', lineHeight: 1.1 }}>
        <div>Dein nächster Zug.</div><div style={{ color: 'hsl(152, 60%, 32%)' }}>Klar vor Augen.</div>
      </div>
      <div style={{ display: 'flex', marginTop: 40, fontSize: 24, color: '#575d5a' }}>Schach verstehen. Mit Stockfish. Ohne KI.</div>
      <div style={{ display: 'flex', marginTop: 'auto', gap: 28, fontSize: 18, color: '#575d5a' }}><span>Stellung aufbauen</span><span>Beste Züge entdecken</span><span>Besser spielen</span></div>
    </div>,
    { ...size },
  )
}
