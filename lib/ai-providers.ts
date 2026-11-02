/**
 * Stufe 2: Aufrufe mit dem eigenen Schlüssel der Nutzerin / des Nutzers.
 * Alle Anfragen gehen direkt vom Browser an Google bzw. OpenAI – kein Zuglotse-Server dazwischen.
 */
export type AiProvider = 'gemini' | 'openai'
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced'
export interface AiSettings {
  mode: 'none' | 'key'
  provider: AiProvider
  apiKey: string
  model: string
  skillLevel?: SkillLevel
}

export const SKILL_LEVEL_LABEL: Record<SkillLevel, string> = {
  beginner: 'Anfänger',
  intermediate: 'Fortgeschritten',
  advanced: 'Experte',
}

export const AI_KEY_STORAGE = 'zuglotse_ai_v1'
export const DEFAULT_MODELS: Record<AiProvider, string> = { gemini: 'gemini-flash-latest', openai: 'gpt-4o-mini' }
export const PROVIDER_LABEL: Record<AiProvider, string> = { gemini: 'Google Gemini', openai: 'OpenAI' }
export const KEY_URL: Record<AiProvider, string> = { gemini: 'https://aistudio.google.com/apikey', openai: 'https://platform.openai.com/api-keys' }

const GEMINI = 'https://generativelanguage.googleapis.com/v1beta'
const OPENAI = 'https://api.openai.com/v1'

export class AiError extends Error {}

async function readError(res: Response, provider: AiProvider): Promise<never> {
  let detail = ''
  try { const body = await res.json(); detail = body?.error?.message ?? '' } catch {}
  console.error(`${PROVIDER_LABEL[provider]} antwortete mit ${res.status}:`, detail)
  if (res.status === 401 || res.status === 403 || /api key not valid|incorrect api key|invalid api key/i.test(detail))
    throw new AiError(`Der ${PROVIDER_LABEL[provider]}-Schlüssel wurde abgelehnt. Bitte prüfe ihn in den Einstellungen.`)
  if (res.status === 429) throw new AiError(`${PROVIDER_LABEL[provider]} meldet ein erreichtes Limit oder fehlendes Guthaben. Versuche es später erneut.`)
  if (res.status === 404) throw new AiError(`Das Modell ist bei ${PROVIDER_LABEL[provider]} nicht verfügbar. Prüfe den Schlüssel erneut, damit Zuglotse ein passendes Modell wählt.`)
  throw new AiError(`${PROVIDER_LABEL[provider]} konnte die Anfrage nicht bearbeiten (${res.status}).${detail ? ` ${detail}` : ''}`)
}

async function call(provider: AiProvider, url: string, init: RequestInit): Promise<any> {
  let res: Response
  try { res = await fetch(url, init) } catch (error) {
    console.error(`Verbindung zu ${PROVIDER_LABEL[provider]} fehlgeschlagen:`, error)
    throw new AiError(`${PROVIDER_LABEL[provider]} hat nicht geantwortet. Mögliche Ursachen: ungültiger Schlüssel, fehlendes Guthaben oder keine Internetverbindung. Prüfe den Schlüssel in den Einstellungen.`)
  }
  if (!res.ok) await readError(res, provider)
  return res.json()
}

const headers = (s: AiSettings): Record<string, string> => s.provider === 'gemini'
  ? { 'Content-Type': 'application/json', 'x-goog-api-key': s.apiKey.trim() }
  : { 'Content-Type': 'application/json', Authorization: `Bearer ${s.apiKey.trim()}` }

/** Prüft den Schlüssel und wählt ein verfügbares, günstiges Modell mit Bildverständnis. */
export async function verifyKey(provider: AiProvider, apiKey: string): Promise<string> {
  const s: AiSettings = { mode: 'key', provider, apiKey, model: '' }
  if (provider === 'gemini') {
    const data = await call(provider, `${GEMINI}/models?pageSize=1000`, { headers: headers(s) })
    const names: string[] = (data?.models ?? [])
      .filter((m: any) => m?.supportedGenerationMethods?.includes('generateContent'))
      .map((m: any) => String(m.name).replace(/^models\//, ''))
    if (names.includes(DEFAULT_MODELS.gemini)) return DEFAULT_MODELS.gemini
    const flash = names.filter(n => /^gemini-[\d.]+-flash$/.test(n))
      .sort((a, b) => parseFloat(b.split('-')[1]) - parseFloat(a.split('-')[1]))
    return flash[0] ?? names.find(n => n.includes('flash')) ?? DEFAULT_MODELS.gemini
  }
  const data = await call(provider, `${OPENAI}/models`, { headers: headers(s) })
  const ids: string[] = (data?.data ?? []).map((m: any) => String(m.id))
  return ['gpt-4o-mini', 'gpt-4.1-mini', 'gpt-5-mini'].find(id => ids.includes(id))
    ?? ids.find(id => /^gpt-[\d.o]+-mini$/.test(id)) ?? DEFAULT_MODELS.openai
}

async function generate(s: AiSettings, prompt: string, opts: { image?: string; json?: boolean }): Promise<string> {
  const model = s.model.trim() || DEFAULT_MODELS[s.provider]
  if (s.provider === 'gemini') {
    const parts: any[] = [{ text: prompt }]
    if (opts.image) {
      const [meta, data] = opts.image.split(',')
      parts.push({ inline_data: { mime_type: meta.match(/data:(.*?);/)?.[1] ?? 'image/jpeg', data } })
    }
    const body = { contents: [{ role: 'user', parts }], generationConfig: { temperature: 0.2, ...(opts.json ? { responseMimeType: 'application/json' } : {}) } }
    const data = await call('gemini', `${GEMINI}/models/${encodeURIComponent(model)}:generateContent`, { method: 'POST', headers: headers(s), body: JSON.stringify(body) })
    const text = (data?.candidates?.[0]?.content?.parts ?? []).map((p: any) => p?.text ?? '').join('').trim()
    if (!text) throw new AiError('Gemini hat keine Antwort geliefert. Möglicherweise wurde die Anfrage gefiltert.')
    return text
  }
  const content: any[] = [{ type: 'text', text: prompt }]
  if (opts.image) content.push({ type: 'image_url', image_url: { url: opts.image, detail: 'high' } })
  const body = { model, messages: [{ role: 'user', content }], ...(opts.json ? { response_format: { type: 'json_object' } } : {}) }
  const data = await call('openai', `${OPENAI}/chat/completions`, { method: 'POST', headers: headers(s), body: JSON.stringify(body) })
  const text = String(data?.choices?.[0]?.message?.content ?? '').trim()
  if (!text) throw new AiError('OpenAI hat keine Antwort geliefert.')
  return text
}

function parseJson(text: string): any {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
  try { return JSON.parse(cleaned) } catch {
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (match) try { return JSON.parse(match[0]) } catch {}
  }
  throw new AiError('Die Antwort der Bilderkennung konnte nicht gelesen werden. Bitte versuche ein anderes Foto.')
}

const RECOGNITION_PROMPT = `Du erkennst Schachstellungen auf Fotos oder Screenshots.
Aufgabe: Bestimme für jedes der 64 Felder die Figur.
1. Finde das Brett und seine Ausrichtung. Feld a1 ist immer ein dunkles Feld unten links aus Sicht von Weiß. Nutze Koordinaten am Rand, falls sichtbar.
2. Lies das Brett Reihe für Reihe von Reihe 8 bis Reihe 1, jeweils von Linie a bis h.
3. Unterscheide sorgfältig: König (Kreuz), Dame (Krone mit Zacken), Läufer (Schlitz/Mitra), Bauer (kleine runde Kugel), Springer (Pferdekopf), Turm (Zinnen). Weiße Figuren hell, schwarze dunkel.
Antworte ausschließlich mit JSON in diesem Format:
{"ranks":["rnbqkbnr","pppppppp","8","8","8","8","PPPPPPPP","RNBQKBNR"],"turn":"w","orientation":"white_bottom","confidence":"high"}
Regeln: "ranks" hat genau 8 Einträge, Reihe 8 zuerst, FEN-Notation (Großbuchstaben Weiß, Kleinbuchstaben Schwarz, Ziffern für leere Felder). Jeder Eintrag beschreibt genau 8 Felder.
"turn" ist "w" oder "b", falls am Bild erkennbar, sonst "unknown". "orientation" ist "white_bottom", "black_bottom" oder "uncertain". "confidence" ist "high", "medium" oder "low".
Wenn kein Schachbrett zu sehen ist, antworte {"error":"kein Schachbrett"}.`

export interface Recognition { ranks: string[]; turn: 'w' | 'b' | null; confidence: string }

export async function recognizeBoard(s: AiSettings, imageDataUrl: string): Promise<Recognition> {
  const parsed = parseJson(await generate(s, RECOGNITION_PROMPT, { image: imageDataUrl, json: true }))
  if (parsed?.error) throw new AiError('Auf dem Foto wurde kein Schachbrett erkannt. Fotografiere das Brett möglichst gerade von oben.')
  if (!Array.isArray(parsed?.ranks) || parsed.ranks.length !== 8) throw new AiError('Die Bilderkennung lieferte keine vollständige Stellung. Bitte versuche ein schärferes Foto.')
  return { ranks: parsed.ranks.map(String), turn: parsed.turn === 'w' || parsed.turn === 'b' ? parsed.turn : null, confidence: String(parsed.confidence ?? 'low') }
}

export interface ExplanationInput {
  fen: string
  sideToMove: string
  candidates: { san: string; evaluation: string; line: string }[]
  facts: string[]
  skillLevel?: SkillLevel
}

export async function explainPosition(s: AiSettings, input: ExplanationInput): Promise<string[]> {
  const level = input.skillLevel ?? s.skillLevel ?? 'beginner'
  const bestSan = input.candidates[0]?.san ?? 'des besten Zuges'
  const otherSide = input.sideToMove === 'Weiß' ? 'Schwarz' : 'Weiß'

  let levelInstruction = ''
  if (level === 'beginner') {
    levelInstruction = `Zielgruppe: Anfänger.
Stil: Sehr einfache Sprache, kurze und klare Sätze. Keine Schachtheorie-Floskeln oder Fachchinesisch.
Aufgabe:
- Beschreibe in genau 2 kurzen Absätzen (insgesamt maximal 4-5 kurze Sätze):
  1. Was ist das konkrete Ziel und der handfeste Nutzen des besten Zuges (${bestSan})?
  2. Welche Absicht verfolgt die Variante und worauf muss ${otherSide} jetzt achten?
- Beziehe dich strikt nur auf die in den Fakten und Varianten genannten Figuren und Züge.`
  } else if (level === 'intermediate') {
    levelInstruction = `Zielgruppe: Fortgeschrittene Spieler.
Stil: Prägnant und verständlich in 2 bis 3 Absätzen.
Aufgabe:
- Erkläre die strategische Idee des besten Zuges (${bestSan}) und den Kernplan der Hauptvariante.
- Zeige kurz auf, warum die vorgeschlagene Fortsetzung stärker ist als die Alternativen.
- Erwähne nur Figuren und Felder, die in den angegebenen Zügen direkt vorkommen.`
  } else {
    levelInstruction = `Zielgruppe: Turnierspieler und Experten.
Stil: Dichte, analytische Schachsprache ohne Allgemeinplätze.
Aufgabe: Präzise Bewertung von Dynamik, Bauernstruktur und Varianten der berechneten Kandidatenzüge. Keine unbeteiligten Figuren oder Felder herbeidichten.`
  }

  const prompt = `Du bist ein erfahrener Schachtrainer und erklärst auf Deutsch.
${levelInstruction}

Stellung: ${input.sideToMove} ist am Zug.
Stockfish-Berechnung (Bewertung aus Sicht von Weiß, + gut für Weiß, − gut für Schwarz, M = Matt):
${input.candidates.map((c, i) => `${i + 1}. ${c.san} (${c.evaluation}) – Variante: ${c.line}`).join('\n')}
Gesicherte Fakten: ${input.facts.join(' ')}

STRIKTE REGELN ZUR VERMEIDUNG VON FEHLERN & HALLUZINATIONEN:
1. Erwähne AUSSCHLIESSLICH die oben genannten Züge (${input.candidates.map(c => c.san).join(', ')}), Felder und Varianten.
2. Erfinde NIEMALS Figurenstellungen, Figurenarten oder Felder, die nicht in den Varianten oder Fakten vorkommen.
3. Behaupte NIEMALS, eine Figur sei „ungeschützt“, „bedroht“ oder „angegriffen“, wenn das nicht unmittelbar aus dem besten Zug (${bestSan}) oder den gesicherten Fakten hervorgeht.
4. Versuche NICHT, das Brett frei zu interpretieren – halte dich strikt an die mathematisch berechneten Varianten.
5. Nutze deutsche Figurenkürzel (K, D, T, L, S).
6. Schreibe kurze, direkte Sätze. Keine Begrüßungsfloskeln.
7. Kein Markdown, keine Überschriften, keine Aufzählungszeichen.`

  const text = await generate(s, prompt, {})
  return text
    .split(/\n\s*\n|\n/)
    .map(p => p.replace(/^[*#\-\s]+/, '').replace(/\*\*/g, '').trim())
    .filter(Boolean)
}

/** Verkleinert Fotos vor dem Senden (spart Datenvolumen und Kosten). */
export function imageToDataUrl(file: File, maxSide = 1600): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      URL.revokeObjectURL(url)
      if (!ctx) { reject(new AiError('Das Foto konnte nicht verarbeitet werden.')); return }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.9))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new AiError('Dieses Bildformat kann dein Browser nicht öffnen. Bitte nutze JPG oder PNG.')) }
    img.src = url
  })
}
