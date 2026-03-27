import { useQuery } from '@tanstack/react-query'

const BASE = import.meta.env.VITE_API_BASE_URL ?? ''

export const statusKeys = {
  all: ['status'],
}

export function useStatus() {
  return useQuery({
    queryKey: statusKeys.all,
    queryFn:  async () => {
      const res = await fetch(`${BASE}/backend/api/status.php`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}
