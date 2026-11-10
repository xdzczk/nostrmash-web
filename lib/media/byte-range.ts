export type ByteRange = { start: number; end: number };

/**
 * One `Range: bytes=` request against a body of `total` bytes.
 * `null` means no usable range was asked for, so the whole body is the answer.
 * `"unsatisfiable"` is a range that starts past the end.
 */
export function resolveByteRange(
  header: string | null | undefined,
  total: number
): ByteRange | "unsatisfiable" | null {
  if (!header) return null;
  const match = /^\s*bytes\s*=\s*(\d*)\s*-\s*(\d*)\s*$/i.exec(header);
  if (!match) return null;
  const [, first = "", last = ""] = match;
  if (first === "" && last === "") return null;
  if (total < 1) return "unsatisfiable";

  if (first === "") {
    const suffix = Number(last);
    if (!Number.isSafeInteger(suffix) || suffix < 1) return "unsatisfiable";
    return { start: Math.max(0, total - suffix), end: total - 1 };
  }

  const start = Number(first);
  if (!Number.isSafeInteger(start) || start >= total) return "unsatisfiable";
  const end = last === "" ? total - 1 : Number(last);
  if (!Number.isSafeInteger(end) || end < start) return "unsatisfiable";
  return { start, end: Math.min(end, total - 1) };
}
