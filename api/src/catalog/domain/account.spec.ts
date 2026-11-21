import { Account } from './account.js';
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
  });
});
