import { Account } from '../../domain/account.js';
import { Code } from '../../domain/code.js';
import { InMemoryAccountRepository } from './in-memory-account.repository.js';

const account = (code: string, name = 'X') =>
  Account.create({ code, name, nature: 'DEBIT' });

describe('InMemoryAccountRepository', () => {
  let repo: InMemoryAccountRepository;

  beforeEach(() => {
    repo = new InMemoryAccountRepository();
  });

  it('saves an account and finds it by code', async () => {
    const activo = account('1', 'Activo');
    await repo.save(activo);

    expect(await repo.findByCode(Code.create('1'))).toBe(activo);
    expect(await repo.existsByCode(Code.create('1'))).toBe(true);
  });

  it('returns null / false for an unknown code', async () => {
    expect(await repo.findByCode(Code.create('9'))).toBeNull();
    expect(await repo.existsByCode(Code.create('9'))).toBe(false);
  });

  it('saving the same code again replaces the account', async () => {
    await repo.save(account('1', 'Activo'));
    await repo.save(account('1', 'Activos'));

    const all = await repo.findAll();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('Activos');
  });

  it('distinguishes codes that differ only by leading zeros', async () => {
    await repo.save(account('0105'));

    expect(await repo.existsByCode(Code.create('0105'))).toBe(true);
    expect(await repo.existsByCode(Code.create('1050'))).toBe(false);
  });

  it('knows whether an account has direct children', async () => {
    await repo.save(account('1'));
    await repo.save(account('11'));

    expect(await repo.hasChildren(Code.create('1'))).toBe(true);
    expect(await repo.hasChildren(Code.create('11'))).toBe(false);
  });

  it('lists every account', async () => {
    await repo.save(account('1'));
    await repo.save(account('2'));

    const codes = (await repo.findAll()).map((a) => a.code.value).sort();
    expect(codes).toEqual(['1', '2']);
  });

  it('deletes an account', async () => {
    await repo.save(account('1'));
    await repo.save(account('11'));

    await repo.delete(Code.create('11'));

    expect(await repo.existsByCode(Code.create('11'))).toBe(false);
    expect(await repo.hasChildren(Code.create('1'))).toBe(false);
  });
});
