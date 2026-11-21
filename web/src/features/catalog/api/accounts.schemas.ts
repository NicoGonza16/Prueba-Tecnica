import { z } from 'zod'
import { childCodeLength, isValidCodeLength, MAX_NAME_LENGTH } from '../lib/accountCode'
import {
  LEVELS,
  NATURES,
  type Account,
  type CreateAccountInput,
  type TreeNode,
} from './types'

/* ------------------------------------------------------------------ */
/* Response schemas: validate what the backend returns at the boundary */
/* ------------------------------------------------------------------ */

export const treeNodeSchema: z.ZodType<TreeNode> = z.object({
  code: z.string(),
  name: z.string(),
  nature: z.enum(NATURES),
  level: z.enum(LEVELS),
  allowsMovements: z.boolean(),
  get children() {
    return z.array(treeNodeSchema)
  },
})

export const catalogSchema = z.array(treeNodeSchema)

export const accountSchema: z.ZodType<Account> = z.object({
  code: z.string(),
  name: z.string(),
  nature: z.enum(NATURES),
  level: z.enum(LEVELS),
  allowsMovements: z.boolean(),
  parentCode: z.string().nullable(),
})

/* ------------------------------------------------------------------ */
/* Form schema: client-side validation before calling POST /accounts   */
/* ------------------------------------------------------------------ */

export type ParentContext = {
  code: string
  name: string
}

/**
 * Builds the create-account form schema.
 *
 * Rules mirrored from the backend: code only digits with length 1/2/4/6, name
 * not blank and at most MAX_NAME_LENGTH characters, nature required only for a
 * class (1 digit). When creating a child
 * of `parent`, the code must also start with the parent code and have the
 * length of the next level. Whether a free-typed parent exists is checked by
 * the backend (PARENT_NOT_FOUND), whose error is shown next to the code field.
 */
export function buildCreateAccountSchema(parent?: ParentContext) {
  const childLength = parent ? childCodeLength(parent.code) : null

  return z
    .object({
      code: z
        .string()
        .trim()
        .min(1, { message: 'El código es obligatorio.', abort: true })
        .regex(/^\d+$/, { message: 'El código solo puede contener dígitos.', abort: true })
        .refine((code) => isValidCodeLength(code.length), {
          message:
            'Longitud inválida: usa 1 dígito (clase), 2 (grupo), 4 (cuenta) o 6 (subcuenta).',
          abort: true,
        })
        .refine((code) => !parent || code.startsWith(parent.code), {
          message: `El código debe empezar por ${parent?.code ?? ''}, el código de la cuenta padre.`,
          abort: true,
        })
        .refine((code) => childLength === null || code.length === childLength, {
          message: `Una cuenta hija de ${parent?.code ?? ''} debe tener ${childLength ?? ''} dígitos.`,
        }),
      name: z
        .string()
        .trim()
        .min(1, 'El nombre es obligatorio.')
        .max(MAX_NAME_LENGTH, `El nombre puede tener como máximo ${MAX_NAME_LENGTH} caracteres.`),
      nature: z.union([z.literal(''), z.enum(NATURES)]),
    })
    .superRefine((values, ctx) => {
      if (!parent && /^\d$/.test(values.code) && values.nature === '') {
        ctx.addIssue({
          code: 'custom',
          path: ['nature'],
          message: 'Una clase debe declarar su naturaleza (Débito o Crédito).',
        })
      }
    })
}

export type CreateAccountFormValues = z.input<ReturnType<typeof buildCreateAccountSchema>>
export type CreateAccountFormOutput = z.output<ReturnType<typeof buildCreateAccountSchema>>

/** Maps validated form values to the API payload: `nature` only for a class. */
export function toCreateAccountInput(values: CreateAccountFormOutput): CreateAccountInput {
  const input: CreateAccountInput = { code: values.code, name: values.name }
  if (values.code.length === 1 && values.nature !== '') input.nature = values.nature
  return input
}
