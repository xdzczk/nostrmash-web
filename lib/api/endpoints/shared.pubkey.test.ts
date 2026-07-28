import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";
import { buildPubkeyCandidates, withPubkeyCandidates } from "@/lib/api/endpoints/shared";
import { hexToNpub } from "@/lib/nostr/npub";

describe("pubkey candidate helpers", () => {
  it("prefers hex first when an npub is provided", () => {
    const hex = "2d9873b25bf2dda6141684d44d5eb76af59f167788a58e363ab1671fefee87f2";
    const npub = hexToNpub(hex);
    expect(npub).toBeTruthy();
    expect(buildPubkeyCandidates(npub!)).toEqual([hex, npub]);
  });

  it("retries only on 404", async () => {
    const hex = "2d9873b25bf2dda6141684d44d5eb76af59f167788a58e363ab1671fefee87f2";
    const npub = hexToNpub(hex)!;
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new ApiError({ status: 404, message: "missing", path: "/profiles/x" }))
      .mockResolvedValueOnce("ok");

    await expect(withPubkeyCandidates(npub, operation)).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("does not retry timeouts", async () => {
    const hex = "2d9873b25bf2dda6141684d44d5eb76af59f167788a58e363ab1671fefee87f2";
    const npub = hexToNpub(hex)!;
    const timeout = new Error("API request timed out after 8000ms: /x");
    timeout.name = "AbortError";
    const operation = vi.fn().mockRejectedValue(timeout);

    await expect(withPubkeyCandidates(npub, operation)).rejects.toThrow(/timed out/i);
    expect(operation).toHaveBeenCalledTimes(1);
  });
});
