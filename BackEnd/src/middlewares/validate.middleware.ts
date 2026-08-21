import { z, type ZodSchema } from 'zod'
import { validator } from 'hono/validator'

export const validateBody = <T extends ZodSchema>(schema: T) =>
  validator('json', (value, c) => {
    const parsed = schema.safeParse(value)
    if (!parsed.success) {
      const issues = parsed.error.issues || []
      return c.json(
        {
          success: false,
          message: 'Validasi data gagal',
          errors: issues.map((e: any) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        400
      )
    }
    return parsed.data as z.infer<T>
  })

export const validateQuery = <T extends ZodSchema>(schema: T) =>
  validator('query', (value, c) => {
    const parsed = schema.safeParse(value)
    if (!parsed.success) {
      const issues = parsed.error.issues || []
      return c.json(
        {
          success: false,
          message: 'Validasi query param gagal',
          errors: issues.map((e: any) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        400
      )
    }
    return parsed.data as z.infer<T>
  })
