import { Account } from '../domain/account.js';
import type { AccountRepository } from '../domain/account.repository.js';
import {
  AccountNotFoundError,
  InvalidAccountCodeError,
  InvalidAccountNameError,
} from '../domain/errors.js';
import { RenameAccountUseCase } from './rename-account.use-case.js';

function mockRepository() {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    findByCode: vi.fn().mockResolvedValue(null),
    existsByCode: vi.fn().mockResolvedValue(true),
    hasChildren: vi.fn().mockResolvedValue(false),
    findAll: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(undefined),
  } satisfies AccountRepository;
}

describe('RenameAccountUseCase', () => {
  let repo: ReturnType<typeof mockRepository>;
  let useCase: RenameAccountUseCase;
  let caja: Account;

  beforeEach(() => {
    repo = mockRepository();
    useCase = new RenameAccountUseCase(repo);
    caja = Account.create({ code: '1105', name: 'Caja', nature: 'DEBIT' });
    repo.findByCode.mockResolvedValue(caja);
  });

  it('renames, saves once and returns the node with the trimmed name', async () => {
    const node = await useCase.execute({ code: '1105', name: '  Caja general  ' });

    expect(node).toEqual({
      code: '1105',
      name: 'Caja general',
      nature: 'DEBIT',
      level: 'ACCOUNT',
      allowsMovements: true,
      parentCode: '11',
    });
    expect(repo.findByCode.mock.calls[0][0].value).toBe('1105');
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(repo.save).toHaveBeenCalledWith(caja);
    expect(caja.name).toBe('Caja general');
  });

  it('reports allowsMovements false for an account with children', async () => {
    repo.hasChildren.mockResolvedValue(true);

    const node = await useCase.execute({ code: '1105', name: 'Caja general' });

    expect(node.allowsMovements).toBe(false);
    expect(repo.hasChildren.mock.calls[0][0].value).toBe('1105');
  });

  it('rejects an invalid code without touching the repository', async () => {
    await expect(useCase.execute({ code: 'abc', name: 'X' })).rejects.toThrow(
      InvalidAccountCodeError,
    );
    expect(repo.findByCode).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('rejects an account that does not exist', async () => {
    repo.findByCode.mockResolvedValue(null);

    await expect(useCase.execute({ code: '9', name: 'X' })).rejects.toThrow(
      AccountNotFoundError,
    );
    expect(repo.save).not.toHaveBeenCalled();
  });

  it.each([
    ['blank', '   '],
    ['too long', 'a'.repeat(101)],
  ])('rejects a %s name without saving or changing the entity', async (_, name) => {
    await expect(useCase.execute({ code: '1105', name })).rejects.toThrow(
      InvalidAccountNameError,
    );
    expect(repo.save).not.toHaveBeenCalled();
    expect(caja.name).toBe('Caja');
  });
});
