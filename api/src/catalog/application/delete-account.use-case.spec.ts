import type { AccountRepository } from '../domain/account.repository.js';
import {
  AccountHasChildrenError,
  AccountNotFoundError,
  InvalidAccountCodeError,
} from '../domain/errors.js';
import { DeleteAccountUseCase } from './delete-account.use-case.js';

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

describe('DeleteAccountUseCase', () => {
  let repo: ReturnType<typeof mockRepository>;
  let useCase: DeleteAccountUseCase;

  beforeEach(() => {
    repo = mockRepository();
    useCase = new DeleteAccountUseCase(repo);
  });

  it('deletes an existing account without children', async () => {
    await useCase.execute('1105');

    expect(repo.delete).toHaveBeenCalledTimes(1);
    expect(repo.delete.mock.calls[0][0].value).toBe('1105');
  });

  it('rejects an invalid code', async () => {
    await expect(useCase.execute('abc')).rejects.toThrow(
      InvalidAccountCodeError,
    );
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('rejects an account that does not exist', async () => {
    repo.existsByCode.mockResolvedValue(false);

    await expect(useCase.execute('1105')).rejects.toThrow(AccountNotFoundError);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('rejects an account with children', async () => {
    repo.hasChildren.mockResolvedValue(true);

    await expect(useCase.execute('11')).rejects.toThrow(
      AccountHasChildrenError,
    );
    expect(repo.delete).not.toHaveBeenCalled();
  });
});
