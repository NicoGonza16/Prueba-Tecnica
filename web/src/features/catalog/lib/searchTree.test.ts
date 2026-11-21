import { describe, expect, it } from 'vitest'
import type { Level, Nature, TreeNode } from '../api/types'
import { findNode, findTextMatch, normalizeText, searchTree } from './searchTree'

const LEVEL_BY_LENGTH: Record<number, Level> = { 1: 'CLASS', 2: 'GROUP', 4: 'ACCOUNT', 6: 'SUBACCOUNT' }

function node(code: string, name: string, children: TreeNode[] = [], nature: Nature = 'DEBIT'): TreeNode {
  return {
    code,
    name,
    nature,
    level: LEVEL_BY_LENGTH[code.length],
    allowsMovements: code.length === 6,
    children,
  }
}

const catalog: TreeNode[] = [
  node('1', 'Activo', [
    node('11', 'Disponible', [
      node('1105', 'Caja', [node('110505', 'Caja general'), node('110510', 'Cajas menores')]),
      node('1110', 'Bancos', [node('111005', 'Moneda nacional')]),
    ]),
    node('13', 'Deudores', [node('1305', 'Clientes')]),
  ]),
  node(
    '2',
    'Pasivo',
    [node('21', 'Obligaciones financieras', [node('2105', 'Crédito bancario')], 'CREDIT')],
    'CREDIT',
  ),
]

/** Codes of every node in the (filtered) tree, depth first. */
function codesOf(nodes: TreeNode[]): string[] {
  return nodes.flatMap((n) => [n.code, ...codesOf(n.children)])
}

describe('normalizeText', () => {
  it('ignores case and accents', () => {
    expect(normalizeText('Crédito BANCARIO')).toBe('credito bancario')
    expect(normalizeText('Pequeña ÁÉÍÓÚ')).toBe('pequena aeiou')
  })
})

describe('findTextMatch', () => {
  it('returns the range over the original text, even with accents', () => {
    const text = 'Crédito bancario'
    const range = findTextMatch(text, 'credito')
    expect(range).toEqual({ start: 0, end: 7 })
    expect(text.slice(range!.start, range!.end)).toBe('Crédito')
  })

  it('maps ranges correctly when the source text is already decomposed (NFD)', () => {
    const text = 'Cre\u0301dito pequen\u0303a' // "Crédito pequeña" with combining marks
    const range = findTextMatch(text, 'PEQUEÑA')
    expect(range).not.toBeNull()
    expect(text.slice(range!.start, range!.end)).toBe('pequen\u0303a')

    const accented = findTextMatch(text, 'cre')
    // The highlight keeps the combining accent with its letter.
    expect(text.slice(accented!.start, accented!.end)).toBe('Cre\u0301')
  })

  it('finds a match in the middle of the text', () => {
    const text = 'Cajas menores'
    const range = findTextMatch(text, 'MENOR')
    expect(text.slice(range!.start, range!.end)).toBe('menor')
  })

  it('returns null when there is no match or the query is empty', () => {
    expect(findTextMatch('Caja', 'banco')).toBeNull()
    expect(findTextMatch('Caja', '')).toBeNull()
  })
})

describe('searchTree', () => {
  it('returns null for a blank query (no search)', () => {
    expect(searchTree(catalog, '')).toBeNull()
    expect(searchTree(catalog, '   ')).toBeNull()
  })

  it('matches codes by prefix', () => {
    const result = searchTree(catalog, '11')!
    expect(result.matches.has('1105')).toBe(true)
    expect(result.matches.get('1105')).toEqual({ codeLength: 2, nameRange: null })
  })

  it('does not match a code that only contains the query', () => {
    const result = searchTree(catalog, '05')!
    expect(result.matches.has('1105')).toBe(false)
    expect(result.count).toBe(0)
  })

  it('matches names ignoring case and accents', () => {
    const result = searchTree(catalog, 'credito')!
    expect([...result.matches.keys()]).toEqual(['2105'])
    expect(result.matches.get('2105')).toEqual({ codeLength: 0, nameRange: { start: 0, end: 7 } })
  })

  it('trims the query', () => {
    const result = searchTree(catalog, '  bancos  ')!
    expect([...result.matches.keys()]).toEqual(['1110'])
  })

  it('puts the ancestors of every match in expandCodes', () => {
    const result = searchTree(catalog, 'moneda')!
    expect([...result.expandCodes].sort()).toEqual(['1', '11', '1110'])
    expect(result.expandCodes.has('111005')).toBe(false)
  })

  it('keeps the complete subtree of a matching node without expanding it', () => {
    const result = searchTree(catalog, 'disponible')!
    const disponible = findNode(result.nodes, '11')!
    expect(codesOf(disponible.children)).toEqual(['1105', '110505', '110510', '1110', '111005'])
    expect(result.expandCodes.has('11')).toBe(false)
    expect(result.expandCodes.has('1')).toBe(true)
  })

  it('expands inside a matching node when it contains more matches', () => {
    const result = searchTree(catalog, 'caja')!
    expect([...result.matches.keys()]).toEqual(['1105', '110505', '110510'])
    expect(result.expandCodes.has('1105')).toBe(true)
    // The full subtree of the matching "Caja" is kept.
    expect(codesOf(findNode(result.nodes, '1105')!.children)).toEqual(['110505', '110510'])
  })

  it('prunes branches without matches', () => {
    const result = searchTree(catalog, 'clientes')!
    expect(codesOf(result.nodes)).toEqual(['1', '13', '1305'])
    expect(result.count).toBe(1)
  })

  it('does not mutate the original tree', () => {
    const before = JSON.stringify(catalog)
    searchTree(catalog, 'clientes')
    expect(JSON.stringify(catalog)).toBe(before)
  })

  it('reports count 0 and an empty tree when nothing matches', () => {
    const result = searchTree(catalog, 'inexistente')!
    expect(result.count).toBe(0)
    expect(result.nodes).toEqual([])
    expect(result.expandCodes.size).toBe(0)
  })
})

describe('findNode', () => {
  it('finds a node at any depth', () => {
    expect(findNode(catalog, '110510')?.name).toBe('Cajas menores')
    expect(findNode(catalog, '2')?.name).toBe('Pasivo')
  })

  it('returns null when the code does not exist', () => {
    expect(findNode(catalog, '9')).toBeNull()
    expect(findNode([], '1')).toBeNull()
  })
})
