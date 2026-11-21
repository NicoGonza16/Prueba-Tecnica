import { Account } from '../domain/account.js';
import type { AccountRepository } from '../domain/account.repository.js';
import { GetCatalogUseCase } from './get-catalog.use-case.js';

describe('GetCatalogUseCase', () => {
  it('returns the accounts of the repository as a tree', async () => {
    const repo = {
      save: vi.fn(),
      findByCode: vi.fn(),
      existsByCode: vi.fn(),
      hasChildren: vi.fn(),
      findAll: vi
        .fn()
        .mockResolvedValue([
          Account.create({ code: '11', name: 'Disponible', nature: 'DEBIT' }),
          Account.create({ code: '1', name: 'Activo', nature: 'DEBIT' }),
        ]),
      delete: vi.fn(),
    } satisfies AccountRepository;

    const tree = await new GetCatalogUseCase(repo).execute();

    expect(repo.findAll).toHaveBeenCalledTimes(1);
    expect(tree).toHaveLength(1);
    expect(tree[0].code).toBe('1');
    expect(tree[0].children.map((child) => child.code)).toEqual(['11']);
  });

  it('returns an empty list for an empty catalog', async () => {
    const repo = {
      save: vi.fn(),
      findByCode: vi.fn(),
      existsByCode: vi.fn(),
      hasChildren: vi.fn(),
      findAll: vi.fn().mockResolvedValue([]),
      delete: vi.fn(),
    } satisfies AccountRepository;

    expect(await new GetCatalogUseCase(repo).execute()).toEqual([]);
  });
});
