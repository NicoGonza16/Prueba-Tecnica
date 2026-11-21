import { describe, expect, it } from 'vitest'
import {
  ancestorCodesOf,
  childCodeLength,
  isValidCodeLength,
  levelOfCode,
  parentCodeOf,
} from './accountCode'

describe('accountCode', () => {
  it('accepts only lengths 1, 2, 4 and 6', () => {
    expect([1, 2, 4, 6].every(isValidCodeLength)).toBe(true)
    expect([0, 3, 5, 7].some(isValidCodeLength)).toBe(false)
  })

  it('derives the level from the length', () => {
    expect(levelOfCode('1')).toBe('CLASS')
    expect(levelOfCode('11')).toBe('GROUP')
    expect(levelOfCode('1105')).toBe('ACCOUNT')
    expect(levelOfCode('110505')).toBe('SUBACCOUNT')
    expect(levelOfCode('110')).toBeNull()
  })

  it('computes the parent code and the child length', () => {
    expect(parentCodeOf('110505')).toBe('1105')
    expect(parentCodeOf('11')).toBe('1')
    expect(parentCodeOf('1')).toBeNull()
    expect(childCodeLength('11')).toBe(4)
    expect(childCodeLength('110505')).toBeNull()
  })

  it('lists every ancestor from the class down', () => {
    expect(ancestorCodesOf('110505')).toEqual(['1', '11', '1105'])
    expect(ancestorCodesOf('1')).toEqual([])
  })
})
