import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import type {
  AccountNode,
  TreeNode,
} from '../../application/account.view.js';
import { CreateAccountUseCase } from '../../application/create-account.use-case.js';
import { DeleteAccountUseCase } from '../../application/delete-account.use-case.js';
import { GetCatalogUseCase } from '../../application/get-catalog.use-case.js';
import { RenameAccountUseCase } from '../../application/rename-account.use-case.js';
import {
  accountCodeParamSchema,
  createAccountBodySchema,
  renameAccountBodySchema,
  type CreateAccountBody,
  type RenameAccountBody,
} from './accounts.schemas.js';

/** HTTP adapter for the catalog: it only translates requests to use cases. */
@Controller('accounts')
export class AccountsController {
  constructor(
    private readonly createAccount: CreateAccountUseCase,
    private readonly getCatalog: GetCatalogUseCase,
    private readonly deleteAccount: DeleteAccountUseCase,
    private readonly renameAccount: RenameAccountUseCase,
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

  @Patch(':code')
  rename(
    @Param('code', { schema: accountCodeParamSchema }) code: string,
    @Body({ schema: renameAccountBodySchema }) body: RenameAccountBody,
  ): Promise<AccountNode> {
    return this.renameAccount.execute({ code, name: body.name });
  }

  @Delete(':code')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('code', { schema: accountCodeParamSchema }) code: string,
  ): Promise<void> {
    return this.deleteAccount.execute(code);
  }
}
