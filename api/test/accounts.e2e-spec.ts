import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { ACCOUNT_REPOSITORY } from './../src/catalog/domain/account.repository.js';

async function createApp(
  configure?: (
    builder: ReturnType<typeof Test.createTestingModule>,
  ) => ReturnType<typeof Test.createTestingModule>,
): Promise<INestApplication<App>> {
  let builder = Test.createTestingModule({ imports: [AppModule] });
  if (configure) builder = configure(builder);
  const moduleFixture = await builder.compile();
  const app = moduleFixture.createNestApplication<INestApplication<App>>();
  await app.init();
  return app;
}

describe('Accounts (e2e)', () => {
  let app: INestApplication<App>;

  const post = (body: unknown) =>
    request(app.getHttpServer())
      .post('/accounts')
      .send(body as object);

  beforeEach(async () => {
    app = await createApp();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /accounts', () => {
    it('201 creates a class with its nature', async () => {
      const res = await post({ code: '1', name: 'Activo', nature: 'DEBIT' });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        code: '1',
        name: 'Activo',
        nature: 'DEBIT',
        level: 'CLASS',
        allowsMovements: true,
        parentCode: null,
      });
    });

    it('201 a child inherits the nature of its class', async () => {
      await post({ code: '2', name: 'Pasivo', nature: 'CREDIT' }).expect(201);

      const res = await post({ code: '21', name: 'Obligaciones' });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        code: '21',
        name: 'Obligaciones',
        nature: 'CREDIT',
        level: 'GROUP',
        allowsMovements: true,
        parentCode: '2',
      });
    });

    it('400 INVALID_CODE for a code with an invalid length', async () => {
      const res = await post({ code: '123', name: 'X', nature: 'DEBIT' });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        code: 'INVALID_CODE',
        detail: expect.stringContaining('123') as string,
      });
    });

    it('400 INVALID_NAME for a blank name', async () => {
      const res = await post({ code: '1', name: '  ', nature: 'DEBIT' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_NAME');
      expect(typeof res.body.detail).toBe('string');
    });

    it('400 INVALID_NATURE for an unknown nature on a class', async () => {
      const res = await post({ code: '1', name: 'Activo', nature: 'OTHER' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_NATURE');
    });

    it('400 MISSING_NATURE for a class without nature', async () => {
      const res = await post({ code: '1', name: 'Activo' });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        code: 'MISSING_NATURE',
        detail: 'Account "1" is a class and must declare a nature.',
      });
    });

    it('400 NATURE_MISMATCH when a child is sent a nature other than its class', async () => {
      await post({ code: '2', name: 'Pasivo', nature: 'CREDIT' }).expect(201);

      const res = await post({ code: '21', name: 'Obligaciones', nature: 'DEBIT' });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        code: 'NATURE_MISMATCH',
        detail:
          'Account "21" inherits the nature CREDIT from its class; it cannot be DEBIT.',
      });
    });

    it('400 INVALID_NATURE when a child is sent an unknown nature', async () => {
      await post({ code: '2', name: 'Pasivo', nature: 'CREDIT' }).expect(201);

      const res = await post({ code: '21', name: 'Obligaciones', nature: 'FOO' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_NATURE');
    });

    it('400 INVALID_NAME for a name over 100 characters', async () => {
      const res = await post({ code: '1', name: 'a'.repeat(101), nature: 'DEBIT' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_NAME');
    });

    it('413 PAYLOAD_TOO_LARGE for a body over the size limit, not a 500', async () => {
      const res = await post({ code: '1', name: 'a'.repeat(200_000), nature: 'DEBIT' });

      expect(res.status).toBe(413);
      expect(res.body.code).toBe('PAYLOAD_TOO_LARGE');
      expect(typeof res.body.detail).toBe('string');
    });

    it('400 PARENT_NOT_FOUND when the parent does not exist', async () => {
      const res = await post({ code: '1105', name: 'Caja' });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        code: 'PARENT_NOT_FOUND',
        detail:
          'Cannot create "1105": its parent account "11" does not exist.',
      });
    });

    it('409 DUPLICATE_CODE for an existing code', async () => {
      await post({ code: '1', name: 'Activo', nature: 'DEBIT' }).expect(201);

      const res = await post({ code: '1', name: 'Otro', nature: 'DEBIT' });

      expect(res.status).toBe(409);
      expect(res.body).toEqual({
        code: 'DUPLICATE_CODE',
        detail: 'An account with code "1" already exists.',
      });
    });

    it('400 VALIDATION_ERROR when the body has the wrong shape', async () => {
      const res = await post({ code: 1, nature: 'DEBIT' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.detail).toContain('code');
      expect(res.body.detail).toContain('name');
    });

    it('400 VALIDATION_ERROR for a malformed JSON body', async () => {
      const res = await request(app.getHttpServer())
        .post('/accounts')
        .set('Content-Type', 'application/json')
        .send('{"code": ');

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /accounts', () => {
    it('200 returns an empty catalog', async () => {
      const res = await request(app.getHttpServer()).get('/accounts');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('200 returns the tree, sorted, with allowsMovements only on leaves', async () => {
      await post({ code: '2', name: 'Pasivo', nature: 'CREDIT' }).expect(201);
      await post({ code: '1', name: 'Activo', nature: 'DEBIT' }).expect(201);
      await post({ code: '12', name: 'Inversiones' }).expect(201);
      await post({ code: '11', name: 'Disponible' }).expect(201);
      await post({ code: '1105', name: 'Caja' }).expect(201);

      const res = await request(app.getHttpServer()).get('/accounts');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([
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
                  allowsMovements: true,
                  children: [],
                },
              ],
            },
            {
              code: '12',
              name: 'Inversiones',
              nature: 'DEBIT',
              level: 'GROUP',
              allowsMovements: true,
              children: [],
            },
          ],
        },
        {
          code: '2',
          name: 'Pasivo',
          nature: 'CREDIT',
          level: 'CLASS',
          allowsMovements: true,
          children: [],
        },
      ]);
    });
  });

  describe('PATCH /accounts/:code', () => {
    const patch = (code: string, body: unknown) =>
      request(app.getHttpServer())
        .patch(`/accounts/${code}`)
        .send(body as object);

    const getTree = async () =>
      (await request(app.getHttpServer()).get('/accounts').expect(200))
        .body as Array<Record<string, unknown> & { children: unknown[] }>;

    it('200 renames a leaf and the catalog shows the new name', async () => {
      await post({ code: '1', name: 'Activo', nature: 'DEBIT' }).expect(201);
      await post({ code: '11', name: 'Disponible' }).expect(201);

      const res = await patch('11', { name: 'Efectivo' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        code: '11',
        name: 'Efectivo',
        nature: 'DEBIT',
        level: 'GROUP',
        allowsMovements: true,
        parentCode: '1',
      });
      const tree = await getTree();
      expect(tree[0].children).toEqual([
        {
          code: '11',
          name: 'Efectivo',
          nature: 'DEBIT',
          level: 'GROUP',
          allowsMovements: true,
          children: [],
        },
      ]);
    });

    it('200 renames a parent (allowsMovements false) and trims the name', async () => {
      await post({ code: '2', name: 'Pasivo', nature: 'CREDIT' }).expect(201);
      await post({ code: '21', name: 'Obligaciones' }).expect(201);

      const res = await patch('2', { name: '  Pasivos  ' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        code: '2',
        name: 'Pasivos',
        nature: 'CREDIT',
        level: 'CLASS',
        allowsMovements: false,
        parentCode: null,
      });
    });

    it('200 renaming with the same name is idempotent', async () => {
      await post({ code: '1', name: 'Activo', nature: 'DEBIT' }).expect(201);

      const res = await patch('1', { name: 'Activo' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Activo');
    });

    it.each([
      ['a blank name', '  '],
      ['a name over 100 characters', 'a'.repeat(101)],
    ])('400 INVALID_NAME for %s and the name is kept', async (_, name) => {
      await post({ code: '1', name: 'Activo', nature: 'DEBIT' }).expect(201);

      const res = await patch('1', { name });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_NAME');
      expect(typeof res.body.detail).toBe('string');
      const tree = await getTree();
      expect(tree[0].name).toBe('Activo');
    });

    it('400 INVALID_CODE for an invalid code', async () => {
      const res = await patch('abc', { name: 'X' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_CODE');
    });

    it('404 ACCOUNT_NOT_FOUND for an unknown account', async () => {
      const res = await patch('9', { name: 'X' });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        code: 'ACCOUNT_NOT_FOUND',
        detail: 'Account "9" was not found.',
      });
    });

    it.each([
      ['without name', {}],
      ['with a non-string name', { name: 1 }],
      ['with extra keys', { name: 'X', code: '2' }],
    ])('400 VALIDATION_ERROR %s', async (_, body) => {
      await post({ code: '1', name: 'Activo', nature: 'DEBIT' }).expect(201);

      const res = await patch('1', body);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(typeof res.body.detail).toBe('string');
      const tree = await getTree();
      expect(tree[0].name).toBe('Activo');
    });

    it('400 VALIDATION_ERROR for a malformed JSON body', async () => {
      const res = await request(app.getHttpServer())
        .patch('/accounts/1')
        .set('Content-Type', 'application/json')
        .send('{"name": ');

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /accounts/:code', () => {
    it('204 deletes a leaf account', async () => {
      await post({ code: '1', name: 'Activo', nature: 'DEBIT' }).expect(201);
      await post({ code: '11', name: 'Disponible' }).expect(201);

      const res = await request(app.getHttpServer()).delete('/accounts/11');

      expect(res.status).toBe(204);
      expect(res.text).toBe('');
      const tree = await request(app.getHttpServer()).get('/accounts');
      expect(tree.body[0].children).toEqual([]);
      expect(tree.body[0].allowsMovements).toBe(true);
    });

    it('400 INVALID_CODE for an invalid code', async () => {
      const res = await request(app.getHttpServer()).delete('/accounts/abc');

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_CODE');
    });

    it('404 ACCOUNT_NOT_FOUND for an unknown account', async () => {
      const res = await request(app.getHttpServer()).delete('/accounts/9');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        code: 'ACCOUNT_NOT_FOUND',
        detail: 'Account "9" was not found.',
      });
    });

    it('409 HAS_CHILDREN for an account with children', async () => {
      await post({ code: '1', name: 'Activo', nature: 'DEBIT' }).expect(201);
      await post({ code: '11', name: 'Disponible' }).expect(201);

      const res = await request(app.getHttpServer()).delete('/accounts/1');

      expect(res.status).toBe(409);
      expect(res.body).toEqual({
        code: 'HAS_CHILDREN',
        detail:
          'Account "1" cannot be deleted because it has child accounts.',
      });
    });
  });
});

describe('Accounts (e2e) non-domain errors', () => {
  it('an unknown route keeps its 404 with the uniform body', async () => {
    const app = await createApp();
    try {
      const res = await request(app.getHttpServer()).get('/nope');

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
      expect(typeof res.body.detail).toBe('string');
    } finally {
      await app.close();
    }
  });

  it('500 INTERNAL_ERROR without leaking the cause', async () => {
    const app = await createApp((builder) =>
      builder.overrideProvider(ACCOUNT_REPOSITORY).useValue({
        findAll: () => Promise.reject(new Error('database is down')),
      }),
    );

    try {
      const res = await request(app.getHttpServer()).get('/accounts');

      expect(res.status).toBe(500);
      expect(res.body).toEqual({
        code: 'INTERNAL_ERROR',
        detail: 'Internal server error',
      });
    } finally {
      await app.close();
    }
  });
});
