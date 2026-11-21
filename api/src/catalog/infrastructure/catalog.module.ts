import { Module, StandardSchemaValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { CreateAccountUseCase } from '../application/create-account.use-case.js';
import { DeleteAccountUseCase } from '../application/delete-account.use-case.js';
import { GetCatalogUseCase } from '../application/get-catalog.use-case.js';
import { RenameAccountUseCase } from '../application/rename-account.use-case.js';
import {
  ACCOUNT_REPOSITORY,
  type AccountRepository,
} from '../domain/account.repository.js';
import { AccountsController } from './http/accounts.controller.js';
import { DomainExceptionFilter } from './http/domain-exception.filter.js';
import { InMemoryAccountRepository } from './persistence/in-memory-account.repository.js';

/**
 * Composition root of the catalog.
 *
 * The use cases are plain classes (no Nest decorators in the application
 * layer), so they are built with factories that receive the repository port
 * by its token. Swapping the persistence only means changing the provider
 * bound to ACCOUNT_REPOSITORY.
 */
@Module({
  controllers: [AccountsController],
  providers: [
    { provide: ACCOUNT_REPOSITORY, useClass: InMemoryAccountRepository },
    {
      provide: CreateAccountUseCase,
      useFactory: (accounts: AccountRepository) =>
        new CreateAccountUseCase(accounts),
      inject: [ACCOUNT_REPOSITORY],
    },
    {
      provide: GetCatalogUseCase,
      useFactory: (accounts: AccountRepository) =>
        new GetCatalogUseCase(accounts),
      inject: [ACCOUNT_REPOSITORY],
    },
    {
      provide: DeleteAccountUseCase,
      useFactory: (accounts: AccountRepository) =>
        new DeleteAccountUseCase(accounts),
      inject: [ACCOUNT_REPOSITORY],
    },
    {
      provide: RenameAccountUseCase,
      useFactory: (accounts: AccountRepository) =>
        new RenameAccountUseCase(accounts),
      inject: [ACCOUNT_REPOSITORY],
    },
    // Runs the `{ schema }` given to @Body/@Param (Standard Schema / Zod).
    { provide: APP_PIPE, useClass: StandardSchemaValidationPipe },
    // Translates domain, validation and unexpected errors to `{ code, detail }`.
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
  ],
})
export class CatalogModule {}
