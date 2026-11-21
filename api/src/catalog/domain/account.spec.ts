import { Account, MAX_NAME_LENGTH } from './account.js';
import {
  InvalidAccountCodeError,
  InvalidAccountNameError,
  InvalidAccountNatureError,
} from './errors.js';

describe('Account', () => {
  describe('create', () => {
    it('builds a valid account and exposes its derived data', () => {
      const account = Account.create({
        code: '1105',
        name: 'Caja',
        nature: 'DEBIT',
      });

      expect(account.code.value).toBe('1105');
      expect(account.name).toBe('Caja');
      expect(account.nature).toBe('DEBIT');
      expect(account.level).toBe('ACCOUNT');
      expect(account.parentCode).toBe('11');
      expect(account.isClass).toBe(false);
    });

    it('a class carries its nature and has no parent', () => {
      const account = Account.create({ code: '1', name: 'Activo', nature: 'DEBIT' });
      expect(account.isClass).toBe(true);
      expect(account.parentCode).toBeNull();
    });

    it('trims the name', () => {
      expect(Account.create({ code: '1', name: '  Activo  ', nature: 'DEBIT' }).name).toBe(
        'Activo',
      );
    });

    it('rejects a blank name', () => {
      expect(() => Account.create({ code: '1', name: '   ', nature: 'DEBIT' })).toThrow(
        InvalidAccountNameError,
      );
    });

    it(`accepts a name of ${MAX_NAME_LENGTH} characters and rejects a longer one`, () => {
      const atLimit = 'a'.repeat(MAX_NAME_LENGTH);
      expect(Account.create({ code: '1', name: atLimit, nature: 'DEBIT' }).name).toBe(atLimit);
      expect(() =>
        Account.create({ code: '1', name: `${atLimit}a`, nature: 'DEBIT' }),
      ).toThrow(InvalidAccountNameError);
    });

    it('measures the limit after trimming', () => {
      const padded = `  ${'a'.repeat(MAX_NAME_LENGTH)}  `;
      expect(Account.create({ code: '1', name: padded, nature: 'DEBIT' }).name).toHaveLength(
        MAX_NAME_LENGTH,
      );
    });

    it('propagates an invalid code', () => {
      expect(() => Account.create({ code: '123', name: 'X', nature: 'DEBIT' })).toThrow(
        InvalidAccountCodeError,
      );
    });

    it('rejects an invalid nature', () => {
      expect(() =>
        Account.create({ code: '1', name: 'X', nature: 'OTHER' as never }),
      ).toThrow(InvalidAccountNatureError);
    });
  });

  describe('rename', () => {
    it('changes the name and keeps everything else', () => {
      const account = Account.create({ code: '1105', name: 'Caja', nature: 'DEBIT' });
      account.rename('Caja general');
      expect(account.name).toBe('Caja general');
      expect(account.code.value).toBe('1105');
    });

    it('rejects a blank new name', () => {
      const account = Account.create({ code: '1105', name: 'Caja', nature: 'DEBIT' });
      expect(() => account.rename('  ')).toThrow(InvalidAccountNameError);
    });

    it('trims the new name', () => {
      const account = Account.create({ code: '1105', name: 'Caja', nature: 'DEBIT' });
      account.rename('  Caja general  ');
      expect(account.name).toBe('Caja general');
    });

    it(`rejects a new name over ${MAX_NAME_LENGTH} characters`, () => {
      const account = Account.create({ code: '1105', name: 'Caja', nature: 'DEBIT' });
      expect(() => account.rename('a'.repeat(MAX_NAME_LENGTH + 1))).toThrow(
        InvalidAccountNameError,
      );
    });

    it('keeps the previous name when a rename is rejected', () => {
      const account = Account.create({ code: '1105', name: 'Caja', nature: 'DEBIT' });
      expect(() => account.rename('  ')).toThrow(InvalidAccountNameError);
      expect(() => account.rename('a'.repeat(MAX_NAME_LENGTH + 1))).toThrow(
        InvalidAccountNameError,
      );
      expect(account.name).toBe('Caja');
    });
  });
});
