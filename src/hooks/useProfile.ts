import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, ensureProfile, type Profile } from '../lib/db'

export function useProfile(): {
  profile: Profile | undefined
  setProfile: (p: Partial<Profile>) => Promise<void>
} {
  const profile = useLiveQuery(() => db.profile.get('me'))

  useEffect(() => { ensureProfile() }, [])

  return {
    profile,
    setProfile: async (patch) => {
      const current = (await db.profile.get('me')) ?? (await ensureProfile())
      await db.profile.put({ ...current, ...patch, id: 'me' })
    }
  }
}

/** Lightweight async one-shot — used for places that don't need reactivity. */
export function useOnce<T>(fn: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null)
  useEffect(() => { fn().then(setData) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return data
}
