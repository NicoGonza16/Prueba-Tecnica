import { Code } from './code.js';
import { InvalidAccountCodeError } from './errors.js';

describe('Code', () => {
  describe('create', () => {
    it.each([
      ['1', 'CLASS'],
      ['11', 'GROUP'],
      ['1105', 'ACCOUNT'],
      ['110505', 'SUBACCOUNT'],
    ] as const)('accepts "%s" and derives level %s', (raw, level) => {
      const code = Code.create(raw);
      expect(code.value).toBe(raw);
      expect(code.level).toBe(level);
    });

    it('preserves leading zeros (the code is text, not a number)', () => {
      const code = Code.create('0105');
      expect(code.value).toBe('0105');
      expect(code.level).toBe('ACCOUNT');
    });

    it.each(['', ' ', 'abc', '11a5', '11.5', '-1'])(
      'rejects non-numeric code %j',
      (raw) => {
        expect(() => Code.create(raw)).toThrow(InvalidAccountCodeError);
      },
    );

    it.each(['111', '11111', '1105050', '12345678'])(
      'rejects invalid length %j',
      (raw) => {
        expect(() => Code.create(raw)).toThrow(InvalidAccountCodeError);
      },
    );
  });

  describe('parent', () => {
    it.each([
      ['110505', '1105'],
      ['1105', '11'],
      ['11', '1'],
    ] as const)('the parent of "%s" is "%s"', (raw, parent) => {
      expect(Code.create(raw).parent()?.value).toBe(parent);
    });

    it('a class has no parent', () => {
      expect(Code.create('1').parent()).toBeNull();
      expect(Code.create('1').isClass).toBe(true);
    });
  });

  describe('equals', () => {
    it('is true for the same value and false otherwise', () => {
      expect(Code.create('1105').equals(Code.create('1105'))).toBe(true);
      expect(Code.create('1105').equals(Code.create('1110'))).toBe(false);
    });
  });
});
