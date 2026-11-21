import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isApiError } from '../../../lib/http'
import { renameAccount } from '../api/accounts.api'
import { catalogQueryKey } from './useCatalog'

/** `PATCH /accounts/:code`; invalidates the catalog so the tree refetches. No optimistic update. */
export function useRenameAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: renameAccount,
    // Keep the mutation pending until the refetch finishes, so the row already
    // shows the new name when the inline form closes.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: catalogQueryKey }),
    onError: (error) => {
      // The account was deleted elsewhere: our cached tree is out of date.
      if (isApiError(error) && error.code === 'ACCOUNT_NOT_FOUND') {
        void queryClient.invalidateQueries({ queryKey: catalogQueryKey })
      }
    },
  })
}
