import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import type {
  AccountNode,
  TreeNode,
} from '../../application/account.view.js';
import { CreateAccountUseCase } from '../../application/create-account.use-case.js';
import { DeleteAccountUseCase } from '../../application/delete-account.use-case.js';
import { GetCatalogUseCase } from '../../application/get-catalog.use-case.js';
import {
  accountCodeParamSchema,
  createAccountBodySchema,
  type CreateAccountBody,
} from './accounts.schemas.js';

/** HTTP adapter for the catalog: it only translates requests to use cases. */
@Controller('accounts')
export class AccountsController {
  constructor(
    private readonly createAccount: CreateAccountUseCase,
    private readonly getCatalog: GetCatalogUseCase,
    private readonly deleteAccount: DeleteAccountUseCase,
  ) {}

  @Post()
  create(
    @Body({ schema: createAccountBodySchema }) body: CreateAccountBody,
  ): Promise<AccountNode> {
    return this.createAccount.execute(body);
  }

  @Get()
  findAll(): Promise<TreeNode[]> {
    return this.getCatalog.execute();
  }

  @Delete(':code')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('code', { schema: accountCodeParamSchema }) code: string,
  ): Promise<void> {
    return this.deleteAccount.execute(code);
  }
}
