import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isApiError } from '../../../lib/http'
import { deleteAccount } from '../api/accounts.api'
import { catalogQueryKey } from './useCatalog'

/** Errors that mean our cached tree is out of date with the server. */
const STALE_TREE_ERRORS = new Set(['ACCOUNT_NOT_FOUND', 'HAS_CHILDREN'])

/** `DELETE /accounts/:code`; invalidates the catalog so the tree refetches. */
export function useDeleteAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteAccount,
    // Keep the mutation pending until the refetch finishes so the node disappears
    // at the same moment the dialog closes.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: catalogQueryKey }),
    onError: (error) => {
      if (isApiError(error) && STALE_TREE_ERRORS.has(error.code)) {
        void queryClient.invalidateQueries({ queryKey: catalogQueryKey })
      }
    },
  })
}
