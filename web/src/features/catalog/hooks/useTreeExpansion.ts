import { useCallback, useMemo, useState } from 'react'
import type { TreeNode } from '../api/types'

function collectParentCodes(nodes: TreeNode[], into: string[] = []): string[] {
  for (const node of nodes) {
    if (node.children.length > 0) {
      into.push(node.code)
      collectParentCodes(node.children, into)
    }
  }
  return into
}

/**
 * UI state of the tree: which nodes are expanded.
 *
 * Until the user interacts, the default is "classes expanded", derived from the
 * data (so no effect is needed to initialise it once the query resolves). The
 * first interaction materialises that default into explicit state.
 */
export function useTreeExpansion(nodes: TreeNode[] | undefined) {
  const [explicit, setExplicit] = useState<Set<string> | null>(null)

  const defaults = useMemo(() => new Set((nodes ?? []).map((node) => node.code)), [nodes])
  const expanded = explicit ?? defaults

  const update = useCallback(
    (change: (current: Set<string>) => Set<string>) =>
      setExplicit((previous) => change(new Set(previous ?? defaults))),
    [defaults],
  )

  const isExpanded = useCallback((code: string) => expanded.has(code), [expanded])

  const toggle = useCallback(
    (code: string) =>
      update((set) => {
        if (set.has(code)) set.delete(code)
        else set.add(code)
        return set
      }),
    [update],
  )

  const setExpanded = useCallback(
    (code: string, value: boolean) =>
      update((set) => {
        if (value) set.add(code)
        else set.delete(code)
        return set
      }),
    [update],
  )

  /** Expands every given code (e.g. the ancestors of a newly created account). */
  const expandMany = useCallback(
    (codes: string[]) =>
      update((set) => {
        for (const code of codes) set.add(code)
        return set
      }),
    [update],
  )

  const expandAll = useCallback(
    () => setExplicit(new Set(collectParentCodes(nodes ?? []))),
    [nodes],
  )

  const collapseAll = useCallback(() => setExplicit(new Set()), [])

  return { isExpanded, toggle, setExpanded, expandMany, expandAll, collapseAll }
}
