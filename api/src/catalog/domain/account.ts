import { Code, type AccountLevel } from './code.js';
import { InvalidAccountNameError } from './errors.js';
import { toNature, type Nature } from './nature.js';

/** Longest accepted account name, after trimming. */
export const MAX_NAME_LENGTH = 100;

export interface CreateAccountProps {
  code: string;
  name: string;
  /** The already-resolved nature (provided for a class, inherited for the rest). */
  nature: Nature;
}

/**
 * An account in the chart of accounts.
 *
 * An `Account` is always in a valid state once constructed: the code is valid,
 * the name is non-empty, and the nature is one of the allowed values. The
 * entity is immutable except for its name, which can be changed through
 * `rename` (used by the optional rename use case).
 *
 * Note: whether an account "allows movements" depends on whether it has
 * children, which is a repository/aggregate concern rather than intrinsic to a
 * single account, so it is computed when building the tree — not stored here.
 */
export class Account {
  readonly code: Code;
  private _name: string;
  readonly nature: Nature;

  private constructor(code: Code, name: string, nature: Nature) {
    this.code = code;
    this._name = name;
    this.nature = nature;
  }

  static create(props: CreateAccountProps): Account {
    const code = Code.create(props.code);
    const name = Account.normalizeName(props.name);
    const nature = toNature(props.nature);
    return new Account(code, name, nature);
  }

  get name(): string {
    return this._name;
  }

  get level(): AccountLevel {
    return this.code.level;
  }

  get isClass(): boolean {
    return this.code.isClass;
  }

  /** The parent's code as a string, or `null` for a class. */
  get parentCode(): string | null {
    return this.code.parent()?.value ?? null;
  }

  rename(name: string): void {
    this._name = Account.normalizeName(name);
  }

  private static normalizeName(name: string): string {
    const trimmed = (name ?? '').trim();
    if (trimmed.length === 0) {
      throw new InvalidAccountNameError('it must not be empty');
    }
    if (trimmed.length > MAX_NAME_LENGTH) {
      throw new InvalidAccountNameError(
        `it must have at most ${MAX_NAME_LENGTH} characters`,
      );
    }
    return trimmed;
  }
}
