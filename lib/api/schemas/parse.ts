import type { z } from "zod";

/**
 * Soft-parse API payloads. On failure, log and return the original value so the
 * UI can still degrade gracefully while the API evolves ahead of schemas.
 */
export function softParseApiPayload<TSchema extends z.ZodType>(
  schema: TSchema,
  value: unknown,
  context: string
): z.infer<TSchema> {
  const result = schema.safeParse(value);
  if (result.success) {
    return result.data;
  }

  console.warn(`[schema] ${context} failed soft validation`, result.error.issues.slice(0, 5));
  return value as z.infer<TSchema>;
}
