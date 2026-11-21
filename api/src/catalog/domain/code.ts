import { InvalidAccountCodeError } from './errors.js';

/**
 * The level of an account, derived purely from the length of its code.
 *
 *   1 digit  → CLASS       (e.g. "1")
 *   2 digits → GROUP       (e.g. "11")
 *   4 digits → ACCOUNT     (e.g. "1105")
 *   6 digits → SUBACCOUNT  (e.g. "110505")
 */
export type AccountLevel = 'CLASS' | 'GROUP' | 'ACCOUNT' | 'SUBACCOUNT';

/** Valid code lengths, in ascending order. The parent of a code is its prefix
 *  at the previous length in this list. */
const VALID_LENGTHS = [1, 2, 4, 6] as const;

const LEVEL_BY_LENGTH: Record<number, AccountLevel> = {
  1: 'CLASS',
  2: 'GROUP',
  4: 'ACCOUNT',
  6: 'SUBACCOUNT',
};

/**
 * Value object representing an account code.
 *
 * It is always valid once constructed: `Code.create` is the only entry point
 * and it enforces that the code is numeric and has a valid length. From the
 * code alone we can derive the level and the parent code (the business rule
 * says the parent is the prefix at the previous level).
 */
export class Code {
  private constructor(public readonly value: string) {}

  static create(raw: string): Code {
    if (typeof raw !== 'string' || raw.length === 0) {
      throw new InvalidAccountCodeError(String(raw), 'it must be a non-empty string');
    }
    if (!/^\d+$/.test(raw)) {
      throw new InvalidAccountCodeError(raw, 'it must contain digits only');
    }
    if (!(VALID_LENGTHS as readonly number[]).includes(raw.length)) {
      throw new InvalidAccountCodeError(
        raw,
        `its length must be one of ${VALID_LENGTHS.join(', ')} digits`,
      );
    }
    return new Code(raw);
  }

  get length(): number {
    return this.value.length;
  }

  get level(): AccountLevel {
    return LEVEL_BY_LENGTH[this.value.length];
  }

  /** A class is the top of the hierarchy and has no parent. */
  get isClass(): boolean {
    return this.value.length === 1;
  }

  /**
   * The code of this account's parent, or `null` for a class.
   *
   * The parent is the prefix of this code at the previous valid length:
   *   "110505" → "1105", "1105" → "11", "11" → "1", "1" → null.
   */
  parent(): Code | null {
    if (this.isClass) return null;
    const index = (VALID_LENGTHS as readonly number[]).indexOf(this.value.length);
    const parentLength = VALID_LENGTHS[index - 1];
    return new Code(this.value.slice(0, parentLength));
  }

  equals(other: Code): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
