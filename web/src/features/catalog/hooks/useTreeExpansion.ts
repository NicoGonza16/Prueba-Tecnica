import { useCallback, useMemo, useState } from 'react'
import type { TreeNode } from '../api/types'

function collectParentCodes(nodes: readonly TreeNode[], into: string[] = []): string[] {
  for (const node of nodes) {
    if (node.children.length > 0) {
      into.push(node.code)
      collectParentCodes(node.children, into)
    }
  }
  return into
}

type TreeExpansionOptions = {
  /** Expanded codes until the user interacts. Defaults to the classes (top-level nodes). */
  defaults?: ReadonlySet<string>
  /**
   * Identity of the view this state belongs to (e.g. the normalized search
   * query). Explicit state saved under another scope is ignored, so changing
   * the scope resets the expansion to `defaults` without an effect.
   */
  scope?: string
}

type ExplicitState = { scope: string; set: Set<string> }

/**
 * UI state of the tree: which nodes are expanded.
 *
 * Until the user interacts, the expansion is `defaults`, derived from the data
 * (so no effect is needed to initialise it once the query resolves). The first
 * interaction materialises that default into explicit state, tagged with the
 * current `scope`.
 */
export function useTreeExpansion(
  nodes: readonly TreeNode[] | undefined,
  { defaults: customDefaults, scope = '' }: TreeExpansionOptions = {},
) {
  const [explicit, setExplicit] = useState<ExplicitState | null>(null)

  const classDefaults = useMemo(() => new Set((nodes ?? []).map((node) => node.code)), [nodes])
  const defaults = customDefaults ?? classDefaults
  const expanded: ReadonlySet<string> =
    explicit && explicit.scope === scope ? explicit.set : defaults

  const update = useCallback(
    (change: (current: Set<string>) => Set<string>) =>
      setExplicit((previous) => ({
        scope,
        set: change(new Set(previous && previous.scope === scope ? previous.set : defaults)),
      })),
    [defaults, scope],
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
    () => setExplicit({ scope, set: new Set(collectParentCodes(nodes ?? [])) }),
    [nodes, scope],
  )

  const collapseAll = useCallback(() => setExplicit({ scope, set: new Set() }), [scope])

  return { isExpanded, toggle, setExpanded, expandMany, expandAll, collapseAll }
}

export type TreeExpansion = ReturnType<typeof useTreeExpansion>
