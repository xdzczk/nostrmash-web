import type { z } from "zod";

import { captureSchemaDrift } from "@/lib/telemetry/sentry";

const HEX_64 = /^[0-9a-f]{64}$/i;

export function isHex64Identity(value: unknown): value is string {
  return typeof value === "string" && HEX_64.test(value.trim());
}

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

  const issues = result.error.issues.slice(0, 5);
  console.warn(`[schema] ${context} failed soft validation`, issues);
  captureSchemaDrift(context, issues);
  return value as z.infer<TSchema>;
}

/**
 * Fail closed when required identity strings are missing. Optionally require
 * hex64 for Nostr event/pubkey identities; otherwise report drift and continue.
 */
export function parseEntityWithIdentity<TSchema extends z.ZodType>(
  schema: TSchema,
  value: Record<string, unknown>,
  context: string,
  options: {
    requireId?: boolean;
    requirePubkey?: boolean;
    strictHexId?: boolean;
    strictHexPubkey?: boolean;
  } = {}
): z.infer<TSchema> | null {
  const id = typeof value.id === "string" ? value.id.trim() : "";
  const pubkey = typeof value.pubkey === "string" ? value.pubkey.trim() : "";

  if (options.requireId && !id) {
    captureSchemaDrift(`${context}:missing_id`, [{ id }]);
    return null;
  }
  if (options.requirePubkey && !pubkey) {
    captureSchemaDrift(`${context}:missing_pubkey`, [{ pubkey }]);
    return null;
  }
  if (options.strictHexId && id && !isHex64Identity(id)) {
    captureSchemaDrift(`${context}:non_hex_id`, [{ id }]);
    return null;
  }
  if (options.strictHexPubkey && pubkey && !isHex64Identity(pubkey)) {
    captureSchemaDrift(`${context}:non_hex_pubkey`, [{ pubkey }]);
    // Soft: keep the row but report drift when hex is expected.
  } else if (options.requirePubkey && pubkey && !isHex64Identity(pubkey)) {
    captureSchemaDrift(`${context}:non_hex_pubkey`, [{ pubkey }]);
  }

  return softParseApiPayload(schema, value, context);
}
