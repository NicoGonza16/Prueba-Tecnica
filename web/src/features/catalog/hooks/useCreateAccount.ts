import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isApiError } from '../../../lib/http'
import { createAccount } from '../api/accounts.api'
import { catalogQueryKey } from './useCatalog'

/** Errors that mean our cached tree is out of date with the server. */
const STALE_TREE_ERRORS = new Set(['DUPLICATE_CODE', 'PARENT_NOT_FOUND'])

/** `POST /accounts`; invalidates the catalog so the tree refetches. */
export function useCreateAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createAccount,
    // Returning the promise keeps the mutation pending until the tree has refetched,
    // so the new node is already visible when the form reports success.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: catalogQueryKey }),
    onError: (error) => {
      if (isApiError(error) && STALE_TREE_ERRORS.has(error.code)) {
        void queryClient.invalidateQueries({ queryKey: catalogQueryKey })
      }
    },
  })
}
