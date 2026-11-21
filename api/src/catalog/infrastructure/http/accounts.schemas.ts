import { z } from 'zod';

/**
 * HTTP input schemas. They only check the SHAPE of the request (types and
 * presence). The business rules (code format and level, non-blank name, valid
 * nature, when nature is required) live in the domain, so their errors keep
 * their specific codes (INVALID_CODE, INVALID_NAME, INVALID_NATURE, ...).
 */
export const createAccountBodySchema = z.object({
  code: z.string({ error: 'code must be a string' }),
  name: z.string({ error: 'name must be a string' }),
  nature: z.string({ error: 'nature must be a string' }).nullish(),
});

export type CreateAccountBody = z.infer<typeof createAccountBodySchema>;

/** Path params always arrive as strings; the domain validates the format. */
export const accountCodeParamSchema = z.string();
