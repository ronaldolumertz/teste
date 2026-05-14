import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

const LS_KEY = 'global_app_version'

async function applyUpdate(newVersion) {
  localStorage.setItem(LS_KEY, newVersion)
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map(r => r.unregister()))
    }
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map(k => caches.delete(k)))
    }
  } finally {
    window.location.reload(true)
  }
}

export function useGlobalVersion() {
  useEffect(() => {
    let channel

    async function checkVersion() {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'app_version')
        .maybeSingle()
      if (!data) return
      const local = localStorage.getItem(LS_KEY)
      if (local !== null && local !== data.value) {
        await applyUpdate(data.value)
      } else if (local === null) {
        // First time — just store current version, no reload
        localStorage.setItem(LS_KEY, data.value)
      }
    }

    checkVersion()

    // Realtime: reload all connected clients when version changes
    channel = supabase
      .channel('global-version')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'system_settings',
        filter: 'key=eq.app_version',
      }, payload => {
        const local = localStorage.getItem(LS_KEY)
        if (local !== payload.new.value) {
          applyUpdate(payload.new.value)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])
}

export const VERSION_LS_KEY = LS_KEY
