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
