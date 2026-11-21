import { Account } from '../domain/account.js';
import type { Nature } from '../domain/nature.js';
import { buildTree } from './catalog-tree.js';

const account = (code: string, name: string, nature: Nature = 'DEBIT') =>
  Account.create({ code, name, nature });

describe('buildTree', () => {
  it('returns an empty list for no accounts', () => {
    expect(buildTree([])).toEqual([]);
  });

  it('nests every account under its parent, with classes as roots', () => {
    const tree = buildTree([
      account('110505', 'Caja general'),
      account('1', 'Activo'),
      account('1105', 'Caja'),
      account('11', 'Disponible'),
    ]);

    expect(tree).toEqual([
      {
        code: '1',
        name: 'Activo',
        nature: 'DEBIT',
        level: 'CLASS',
        allowsMovements: false,
        children: [
          {
            code: '11',
            name: 'Disponible',
            nature: 'DEBIT',
            level: 'GROUP',
            allowsMovements: false,
            children: [
              {
                code: '1105',
                name: 'Caja',
                nature: 'DEBIT',
                level: 'ACCOUNT',
                allowsMovements: false,
                children: [
                  {
                    code: '110505',
                    name: 'Caja general',
                    nature: 'DEBIT',
                    level: 'SUBACCOUNT',
                    allowsMovements: true,
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]);
  });

  it('sorts every level by code ascending', () => {
    const tree = buildTree([
      account('2', 'Pasivo', 'CREDIT'),
      account('12', 'Inversiones'),
      account('1', 'Activo'),
      account('11', 'Disponible'),
    ]);

    expect(tree.map((node) => node.code)).toEqual(['1', '2']);
    expect(tree[0].children.map((node) => node.code)).toEqual(['11', '12']);
  });

  it('only accounts without children allow movements', () => {
    const [activo, pasivo] = buildTree([
      account('1', 'Activo'),
      account('11', 'Disponible'),
      account('2', 'Pasivo', 'CREDIT'),
    ]);

    expect(activo.allowsMovements).toBe(false);
    expect(activo.children[0].allowsMovements).toBe(true);
    expect(pasivo.allowsMovements).toBe(true);
  });

  it('keeps the resolved nature of each account', () => {
    const [pasivo] = buildTree([
      account('2', 'Pasivo', 'CREDIT'),
      account('21', 'Obligaciones', 'CREDIT'),
    ]);

    expect(pasivo.nature).toBe('CREDIT');
    expect(pasivo.children[0].nature).toBe('CREDIT');
  });
});
