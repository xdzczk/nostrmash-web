import { afterEach, describe, expect, it, vi } from "vitest";
import { toUserFacingErrorMessage } from "@/lib/errors/user-message";

describe("toUserFacingErrorMessage", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the fallback in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(toUserFacingErrorMessage(new Error("API 500: boom"), "Request failed.")).toBe(
      "Request failed."
    );
  });

  it("returns the raw error message in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(toUserFacingErrorMessage(new Error("API 500: boom"), "Request failed.")).toBe(
      "API 500: boom"
    );
  });

  it("falls back when the development error has no message", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(toUserFacingErrorMessage(new Error("   "), "Request failed.")).toBe("Request failed.");
    expect(toUserFacingErrorMessage({}, "Request failed.")).toBe("Request failed.");
  });
});
