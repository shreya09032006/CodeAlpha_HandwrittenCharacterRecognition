// Sample payloads used ONLY when the backend is offline. The UI labels them.
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export const demo = {
  character: () => ({
    prediction: 'g',
    case: 'lowercase',
    confidence: 0.94,
    top: [
      { label: 'g', prob: 0.94 },
      { label: 'q', prob: 0.03 },
      { label: '9', prob: 0.015 },
      { label: 'y', prob: 0.01 },
      { label: 'a', prob: 0.005 },
    ],
  }),
  word: () => ({
    text: 'Handwriting',
    confidence: 0.91,
    words: [{ text: 'Handwriting', confidence: 0.91 }],
  }),
  essay: () => ({
    id: 'demo',
    raw_text:
      'Technology have changed the way we lives. Many peoples now writes less by hand, but i believe handwriting still matter because it help us think slowly and remember better.',
    corrected_text:
      'Technology has changed the way we live. Many people now write less by hand, but I believe handwriting still matters because it helps us think slowly and remember better.',
    scores: { grammar: 62, spelling: 70, clarity: 78, overall: 70 },
    feedback: [
      { type: 'grammar', original: 'Technology have', suggestion: 'Technology has', note: 'Singular subject needs "has".' },
      { type: 'grammar', original: 'the way we lives', suggestion: 'the way we live', note: 'Plain verb after "we".' },
      { type: 'spelling', original: 'peoples', suggestion: 'people', note: '"People" is already plural.' },
      { type: 'grammar', original: 'writes', suggestion: 'write', note: 'Verb agrees with "people".' },
      { type: 'style', original: 'i', suggestion: 'I', note: 'Capitalise the pronoun "I".' },
      { type: 'grammar', original: 'matter because it help', suggestion: 'matters because it helps', note: 'Third-person singular.' },
    ],
  }),
  history: () => [
    { id: 'd1', mode: 'essay', created_at: '2026-11-10T09:12:00Z', snippet: 'Technology have changed the way we lives…', confidence: 0.88 },
    { id: 'd2', mode: 'word', created_at: '2026-11-09T16:40:00Z', snippet: 'Handwriting', confidence: 0.91 },
    { id: 'd3', mode: 'character', created_at: '2026-11-09T11:05:00Z', snippet: 'g (lowercase)', confidence: 0.94 },
  ],
  analytics: () => ({
    scans: days.map((day, i) => ({ day, character: 4 + ((i * 3) % 6), word: 2 + ((i * 5) % 4), essay: 1 + (i % 3) })),
    confidence: days.map((day, i) => ({ day, value: Math.round((0.86 + ((i * 7) % 9) / 100) * 100) })),
    issues: [
      { type: 'Grammar', count: 14 },
      { type: 'Spelling', count: 9 },
      { type: 'Punctuation', count: 6 },
      { type: 'Style', count: 4 },
    ],
  }),
}
