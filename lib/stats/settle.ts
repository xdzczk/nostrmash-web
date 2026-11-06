import { ApiError } from "@/lib/api/errors";
import { toUserFacingErrorMessage } from "@/lib/errors/user-message";

export async function settle<T>(
  promise: Promise<T>,
  fallback: string
): Promise<{ value: T | null; error: string | null }> {
  try {
    return { value: await promise, error: null };
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) return { value: null, error: null };
    return { value: null, error: toUserFacingErrorMessage(error, fallback) };
  }
}
