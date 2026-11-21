import { useQuery } from '@tanstack/react-query'
import { getCatalog } from '../api/accounts.api'

export const catalogQueryKey = ['catalog'] as const

/** Server state of the nested catalog (`GET /accounts`), cached under `['catalog']`. */
export function useCatalog() {
  return useQuery({
    queryKey: catalogQueryKey,
    queryFn: ({ signal }) => getCatalog(signal),
  })
}
