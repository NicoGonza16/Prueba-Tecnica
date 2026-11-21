import {
  BadRequestException,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import {
  AccountHasChildrenError,
  AccountNotFoundError,
  DuplicateAccountCodeError,
  InvalidAccountCodeError,
  InvalidAccountNameError,
  InvalidAccountNatureError,
  MissingNatureError,
  ParentAccountNotFoundError,
  type DomainError,
} from '../../domain/errors.js';

/** Uniform error body of the API. */
export interface ErrorBody {
  code: string;
  detail: string;
}

type DomainErrorClass = abstract new (...args: never[]) => DomainError;

/** Domain error → HTTP status and API error code. */
const DOMAIN_ERROR_MAP: ReadonlyArray<
  readonly [DomainErrorClass, HttpStatus, string]
> = [
  [InvalidAccountCodeError, HttpStatus.BAD_REQUEST, 'INVALID_CODE'],
  [InvalidAccountNameError, HttpStatus.BAD_REQUEST, 'INVALID_NAME'],
  [InvalidAccountNatureError, HttpStatus.BAD_REQUEST, 'INVALID_NATURE'],
  [MissingNatureError, HttpStatus.BAD_REQUEST, 'MISSING_NATURE'],
  [ParentAccountNotFoundError, HttpStatus.BAD_REQUEST, 'PARENT_NOT_FOUND'],
  [DuplicateAccountCodeError, HttpStatus.CONFLICT, 'DUPLICATE_CODE'],
  [AccountNotFoundError, HttpStatus.NOT_FOUND, 'ACCOUNT_NOT_FOUND'],
  [AccountHasChildrenError, HttpStatus.CONFLICT, 'HAS_CHILDREN'],
];

/**
 * Translates every error into the uniform `{ code, detail }` body.
 *
 * - Domain errors → their status (400/404/409) and code; `detail` is the
 *   domain message.
 * - `BadRequestException` (what `StandardSchemaValidationPipe` throws when a
 *   schema fails, and what Nest throws for a malformed JSON body) → 400
 *   VALIDATION_ERROR, with the issue messages joined in `detail`.
 * - Any other `HttpException` (e.g. an unknown route) keeps its status.
 * - Anything else → 500 INTERNAL_ERROR, without leaking internals.
 */
@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.adapterHost;
    const [status, body] = this.toResponse(exception);
    httpAdapter.reply(host.switchToHttp().getResponse(), body, status);
  }

  private toResponse(exception: unknown): [number, ErrorBody] {
    for (const [errorClass, status, code] of DOMAIN_ERROR_MAP) {
      if (exception instanceof errorClass) {
        return [status, { code, detail: exception.message }];
      }
    }

    if (exception instanceof BadRequestException) {
      return [
        HttpStatus.BAD_REQUEST,
        { code: 'VALIDATION_ERROR', detail: httpExceptionDetail(exception) },
      ];
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const code = (HttpStatus[status] as string | undefined) ?? 'HTTP_ERROR';
      return [status, { code, detail: httpExceptionDetail(exception) }];
    }

    this.logger.error(
      'Unhandled error',
      exception instanceof Error ? exception.stack : String(exception),
    );
    return [
      HttpStatus.INTERNAL_SERVER_ERROR,
      { code: 'INTERNAL_ERROR', detail: 'Internal server error' },
    ];
  }
}

/** The message(s) of an HttpException as a single string. */
function httpExceptionDetail(exception: HttpException): string {
  const response = exception.getResponse();
  if (typeof response === 'string') return response;
  const message = (response as { message?: unknown }).message;
  if (Array.isArray(message)) return message.map(String).join('; ');
  if (typeof message === 'string') return message;
  return exception.message;
}
