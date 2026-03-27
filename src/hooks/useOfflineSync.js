import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { offlineQueue } from '../lib/offlineQueue'
import { useOnlineStatus } from './useOnlineStatus'

export function useOfflineSync() {
  const isOnline = useOnlineStatus()
  const [syncing, setSyncing] = useState(false)
  const [pendingCount, setPendingCount] = useState(() => offlineQueue.count())

  // Keep pendingCount in sync with queue
  useEffect(() => {
    const update = () => setPendingCount(offlineQueue.count())
    window.addEventListener('bp-queue-updated', update)
    return () => window.removeEventListener('bp-queue-updated', update)
  }, [])

  useEffect(() => {
    if (!isOnline) return
    const queue = offlineQueue.getAll()
    if (queue.length === 0) return

    const sync = async () => {
      setSyncing(true)
      let syncedCount = 0

      for (const item of queue) {
        try {
          const q = supabase.from(item.table)
          if (item.operation === 'insert') {
            const { error } = await q.insert(item.data)
            if (error) throw error
          } else if (item.operation === 'upsert') {
            const { error } = await q.upsert(item.data, item.upsertOptions || {})
            if (error) throw error
          } else if (item.operation === 'delete') {
            let dq = q.delete()
            Object.entries(item.match || {}).forEach(([k, v]) => { dq = dq.eq(k, v) })
            const { error } = await dq
            if (error) throw error
          } else if (item.operation === 'update') {
            let uq = q.update(item.data)
            Object.entries(item.match || {}).forEach(([k, v]) => { uq = uq.eq(k, v) })
            const { error } = await uq
            if (error) throw error
          }
          offlineQueue.remove(item.id)
          syncedCount++
        } catch {
          // Keep failed items in queue, move to next
        }
      }

      setSyncing(false)
      setPendingCount(offlineQueue.count())

      if (syncedCount > 0) {
        window.dispatchEvent(new CustomEvent('bp-sync-complete', { detail: { count: syncedCount } }))
      }
    }

    sync()
  }, [isOnline])

  return { syncing, pendingCount }
}
