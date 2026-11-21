import type { TreeNode } from '../api/types'

/**
 * Client-side search over the catalog tree (pure functions, no React).
 *
 * `GET /accounts` already returns the whole tree into the React Query cache, so
 * filtering it in memory is instant and needs no extra request or loading
 * state. Searching is presentation, not a business rule.
 */

/** Half-open range `[start, end)` of UTF-16 indices over the ORIGINAL text. */
export type TextRange = { start: number; end: number }

/** Why a node matched: length of the matching code prefix (0 = none) and the name range. */
export type NodeMatch = { codeLength: number; nameRange: TextRange | null }

export type SearchResult = {
  /** Normalized query the result was computed for (stable identity of the search). */
  query: string
  /** Filtered tree: matches, their ancestors and the full subtree of every match. */
  nodes: TreeNode[]
  /** Matching nodes by code. */
  matches: Map<string, NodeMatch>
  /** Ancestors of some match: they must be expanded to reveal it. */
  expandCodes: Set<string>
  /** Number of matching nodes. */
  count: number
}

/** Case- and accent-insensitive form of `text` ("Crédito" -> "credito"). */
export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es')
}

/**
 * Finds `query` in `text` ignoring case and accents, returning the range over
 * the original text (for highlighting). NFD changes string lengths, so the text
 * is normalized one character at a time, remembering where each normalized
 * character came from.
 */
export function findTextMatch(text: string, query: string): TextRange | null {
  const needle = normalizeText(query)
  if (needle === '') return null

  let normalized = ''
  // For each normalized character: [start, end) of the original character it came from.
  const starts: number[] = []
  const ends: number[] = []
  let index = 0

  for (const char of text) {
    const piece = normalizeText(char)
    if (piece === '') {
      // A combining mark already decomposed in the source: attach it to the
      // previous character so a highlight never splits a letter from its accent.
      if (ends.length > 0) ends[ends.length - 1] = index + char.length
    }
    for (let i = 0; i < piece.length; i++) {
      starts.push(index)
      ends.push(index + char.length)
    }
    normalized += piece
    index += char.length
  }

  const at = normalized.indexOf(needle)
  if (at === -1) return null
  return { start: starts[at], end: ends[at + needle.length - 1] }
}

/**
 * Filters the tree by `rawQuery` (trimmed; blank means "no search" -> null).
 *
 * A node matches when its code STARTS WITH the query or its normalized name
 * CONTAINS it. The result keeps matches and their ancestors; a matching node
 * keeps its complete subtree. Ancestors of every match (including matches
 * nested inside another match) go to `expandCodes`.
 */
export function searchTree(nodes: readonly TreeNode[], rawQuery: string): SearchResult | null {
  const query = normalizeText(rawQuery.trim())
  if (query === '') return null

  const matches = new Map<string, NodeMatch>()
  const expandCodes = new Set<string>()

  const visit = (node: TreeNode): TreeNode | null => {
    const codeLength = node.code.startsWith(query) ? query.length : 0
    const nameRange = findTextMatch(node.name, query)
    const isMatch = codeLength > 0 || nameRange !== null
    if (isMatch) matches.set(node.code, { codeLength, nameRange })

    const kept: TreeNode[] = []
    for (const child of node.children) {
      const keptChild = visit(child)
      if (keptChild) kept.push(keptChild)
    }
    if (kept.length > 0) expandCodes.add(node.code)

    if (isMatch) return { ...node }
    if (kept.length > 0) return { ...node, children: kept }
    return null
  }

  const filtered: TreeNode[] = []
  for (const node of nodes) {
    const kept = visit(node)
    if (kept) filtered.push(kept)
  }

  return { query, nodes: filtered, matches, expandCodes, count: matches.size }
}

/** Node with `code` anywhere in the tree, or null. */
export function findNode(nodes: readonly TreeNode[], code: string): TreeNode | null {
  for (const node of nodes) {
    if (node.code === code) return node
    const found = findNode(node.children, code)
    if (found) return found
  }
  return null
}
