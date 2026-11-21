import { Account } from '../domain/account.js';
import type { AccountRepository } from '../domain/account.repository.js';
import {
  DuplicateAccountCodeError,
  InvalidAccountCodeError,
  InvalidAccountNameError,
  InvalidAccountNatureError,
  MissingNatureError,
  ParentAccountNotFoundError,
} from '../domain/errors.js';
import { CreateAccountUseCase } from './create-account.use-case.js';

function mockRepository() {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    findByCode: vi.fn().mockResolvedValue(null),
    existsByCode: vi.fn().mockResolvedValue(false),
    hasChildren: vi.fn().mockResolvedValue(false),
    findAll: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(undefined),
  } satisfies AccountRepository;
}

describe('CreateAccountUseCase', () => {
  let repo: ReturnType<typeof mockRepository>;
  let useCase: CreateAccountUseCase;

  beforeEach(() => {
    repo = mockRepository();
    useCase = new CreateAccountUseCase(repo);
  });

  it('creates a class with the given nature and returns its node', async () => {
    const node = await useCase.execute({
      code: '1',
      name: 'Activo',
      nature: 'DEBIT',
    });

    expect(node).toEqual({
      code: '1',
      name: 'Activo',
      nature: 'DEBIT',
      level: 'CLASS',
      allowsMovements: true,
      parentCode: null,
    });
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect((repo.save.mock.calls[0][0] as Account).code.value).toBe('1');
  });

  it('a non-class inherits the nature of its parent, ignoring the given one', async () => {
    repo.findByCode.mockResolvedValue(
      Account.create({ code: '2', name: 'Pasivo', nature: 'CREDIT' }),
    );

    const node = await useCase.execute({
      code: '21',
      name: 'Obligaciones financieras',
      nature: 'DEBIT',
    });

    expect(repo.findByCode.mock.calls[0][0].value).toBe('2');
    expect(node.nature).toBe('CREDIT');
    expect(node.level).toBe('GROUP');
    expect(node.parentCode).toBe('2');
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('rejects an invalid code before touching the repository', async () => {
    await expect(
      useCase.execute({ code: '123', name: 'X', nature: 'DEBIT' }),
    ).rejects.toThrow(InvalidAccountCodeError);
    expect(repo.existsByCode).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('rejects a duplicate code', async () => {
    repo.existsByCode.mockResolvedValue(true);

    await expect(
      useCase.execute({ code: '1', name: 'Activo', nature: 'DEBIT' }),
    ).rejects.toThrow(DuplicateAccountCodeError);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('rejects a class without nature', async () => {
    await expect(
      useCase.execute({ code: '1', name: 'Activo' }),
    ).rejects.toThrow(MissingNatureError);
    await expect(
      useCase.execute({ code: '1', name: 'Activo', nature: null }),
    ).rejects.toThrow(MissingNatureError);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('rejects a class with an invalid nature', async () => {
    await expect(
      useCase.execute({ code: '1', name: 'Activo', nature: 'OTHER' }),
    ).rejects.toThrow(InvalidAccountNatureError);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('rejects a non-class whose parent does not exist', async () => {
    await expect(
      useCase.execute({ code: '1105', name: 'Caja' }),
    ).rejects.toThrow(ParentAccountNotFoundError);
    expect(repo.findByCode.mock.calls[0][0].value).toBe('11');
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('rejects a blank name', async () => {
    await expect(
      useCase.execute({ code: '1', name: '   ', nature: 'DEBIT' }),
    ).rejects.toThrow(InvalidAccountNameError);
    expect(repo.save).not.toHaveBeenCalled();
  });
});
