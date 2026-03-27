const PREFIX = 'bp:'
const DEFAULT_TTL = 24 * 60 * 60 * 1000 // 24h

export const cache = {
  set(key, data) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify({ data, ts: Date.now() }))
    } catch { /* localStorage plein ou indisponible */ }
  },

  get(key, maxAge = DEFAULT_TTL) {
    try {
      const raw = localStorage.getItem(PREFIX + key)
      if (!raw) return null
      const { data, ts } = JSON.parse(raw)
      if (Date.now() - ts > maxAge) return null
      return data
    } catch { return null }
  },

  clear(key) {
    try { localStorage.removeItem(PREFIX + key) } catch { /* */ }
  },
}
