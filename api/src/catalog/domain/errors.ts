/**
 * Domain errors for the chart-of-accounts catalog.
 *
 * These belong to the innermost layer: they know nothing about HTTP or NestJS.
 * The infrastructure layer (an exception filter) is responsible for translating
 * each one into the right HTTP status code (400 / 404 / 409).
 */

export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message);
    // Keep the concrete subclass name as the error name (useful in logs/tests).
    this.name = new.target.name;
  }
}

/** The code is not numeric, is empty, or has an invalid length. → 400 */
export class InvalidAccountCodeError extends DomainError {
  constructor(code: string, reason: string) {
    super(`Invalid account code "${code}": ${reason}.`);
  }
}

/** The account name is missing or blank. → 400 */
export class InvalidAccountNameError extends DomainError {
  constructor(reason: string) {
    super(`Invalid account name: ${reason}.`);
  }
}

/** The nature is not one of the allowed values. → 400 */
export class InvalidAccountNatureError extends DomainError {
  constructor(value: string) {
    super(`Invalid account nature "${value}": it must be "DEBIT" or "CREDIT".`);
  }
}

/** A class-level account was created without a nature. → 400 */
export class MissingNatureError extends DomainError {
  constructor(code: string) {
    super(`Account "${code}" is a class and must declare a nature.`);
  }
}

/**
 * A non-class account was sent a nature different from the one it inherits.
 * Descendants always inherit the nature of their class (rule 8). → 400
 */
export class NatureMismatchError extends DomainError {
  constructor(code: string, requested: string, inherited: string) {
    super(
      `Account "${code}" inherits the nature ${inherited} from its class; it cannot be ${requested}.`,
    );
  }
}

/** The code already exists in the catalog (uniqueness rule). → 409 */
export class DuplicateAccountCodeError extends DomainError {
  constructor(code: string) {
    super(`An account with code "${code}" already exists.`);
  }
}

/** A non-class account was created but its parent does not exist. → 400 */
export class ParentAccountNotFoundError extends DomainError {
  constructor(parentCode: string, code: string) {
    super(`Cannot create "${code}": its parent account "${parentCode}" does not exist.`);
  }
}

/** The requested account does not exist. → 404 */
export class AccountNotFoundError extends DomainError {
  constructor(code: string) {
    super(`Account "${code}" was not found.`);
  }
}

/** An account with children cannot be deleted. → 409 */
export class AccountHasChildrenError extends DomainError {
  constructor(code: string) {
    super(`Account "${code}" cannot be deleted because it has child accounts.`);
  }
}
