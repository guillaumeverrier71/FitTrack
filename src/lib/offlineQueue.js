const KEY = 'bp:queue'

export const offlineQueue = {
  add(operation, table, data, options = {}) {
    const id = `q_${Date.now()}_${Math.random().toString(36).slice(2)}`
    try {
      const queue = this.getAll()
      queue.push({ id, ts: Date.now(), operation, table, data, ...options })
      localStorage.setItem(KEY, JSON.stringify(queue))
    } catch {}
    return id
  },
  getAll() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
  },
  remove(id) {
    try {
      const queue = this.getAll().filter(item => item.id !== id)
      localStorage.setItem(KEY, JSON.stringify(queue))
    } catch {}
  },
  count() {
    return this.getAll().length
  },
}
