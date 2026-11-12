// API contract for the Flask backend (built next). Every call can carry the
// Supabase access token. When the backend is unreachable and
// VITE_DEMO_FALLBACK is not "false", a clearly-labelled sample is returned
// (result.demo === true) so the UI can be developed before the models exist.
import { demo } from './demo'

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')
const FALLBACK = import.meta.env.VITE_DEMO_FALLBACK !== 'false'

export const ACCEPTED = ['image/jpeg', 'image/png']
export const MAX_MB = 10

export function validateImage(file) {
  if (!file) return 'Choose an image first.'
  if (!ACCEPTED.includes(file.type)) return 'Only JPG, JPEG and PNG images are supported.'
  if (file.size > MAX_MB * 1024 * 1024) return `Image is larger than ${MAX_MB} MB.`
  return null
}

async function request(path, { token, body, method = 'GET' } = {}) {
  const res = await fetch(BASE + path, {
    method,
    body,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  if (!res.ok) {
    let msg = `Request failed (${res.status})`
    try { msg = (await res.json()).error || msg } catch {}
    const err = new Error(msg)
    err.http = true
    throw err
  }
  return res
}

async function withFallback(call, sample) {
  try {
    return await call()
  } catch (e) {
    if (e.http || !FALLBACK) throw e // real server error: show it
    await new Promise(r => setTimeout(r, 900))
    const d = sample()
    return Array.isArray(d) ? Object.assign(d, { demo: true }) : { ...d, demo: true }
  }
}

const form = file => { const f = new FormData(); f.append('image', file); return f }

// POST /api/recognize/character -> { prediction, case, confidence, top: [{label, prob}] }
export const recognizeCharacter = (file, token) =>
  withFallback(async () => (await request('/api/recognize/character', { token, body: form(file), method: 'POST' })).json(), demo.character)

// POST /api/recognize/word -> { text, confidence, words: [{text, confidence}] }
export const recognizeWord = (file, token) =>
  withFallback(async () => (await request('/api/recognize/word', { token, body: form(file), method: 'POST' })).json(), demo.word)

// POST /api/essays -> { id, raw_text, corrected_text, scores, feedback: [{type, original, suggestion, note}] }
export const correctEssay = (file, token) =>
  withFallback(async () => (await request('/api/essays', { token, body: form(file), method: 'POST' })).json(), demo.essay)

// GET /api/essays/:id/report -> PDF (ReportLab)
export async function downloadReport(id, token) {
  const res = await request(`/api/essays/${id}/report`, { token })
  const url = URL.createObjectURL(await res.blob())
  const a = Object.assign(document.createElement('a'), { href: url, download: `inklens-essay-${id}.pdf` })
  a.click()
  URL.revokeObjectURL(url)
}

// GET /api/history -> [{ id, mode, created_at, snippet, confidence }]
export const getHistory = token =>
  withFallback(async () => (await request('/api/history', { token })).json(), demo.history)

// GET /api/analytics -> { scans: [{day, character, word, essay}], confidence: [{day, value}], issues: [{type, count}] }
export const getAnalytics = token =>
  withFallback(async () => (await request('/api/analytics', { token })).json(), demo.analytics)
