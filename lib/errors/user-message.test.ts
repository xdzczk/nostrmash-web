import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";
import {
  summarizeLoadErrors,
  toDevErrorDetail,
  toUserFacingErrorMessage,
} from "@/lib/errors/user-message";

describe("toUserFacingErrorMessage", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("maps rate limits to a calm busy message in every environment", () => {
    vi.stubEnv("NODE_ENV", "production");
    const error = new ApiError({
      status: 429,
      message: "API 429: too many requests - request_id: abc",
      path: "/api/v1/discovery/home",
      requestId: "abc",
    });
    expect(toUserFacingErrorMessage(error, "Failed to load.")).toBe(
      "The index is busy right now — this section will refresh shortly."
    );

    vi.stubEnv("NODE_ENV", "development");
    expect(toUserFacingErrorMessage(error, "Failed to load.")).toBe(
      "The index is busy right now — this section will refresh shortly."
    );
  });

  it("maps timeouts to a calm retry message", () => {
    expect(
      toUserFacingErrorMessage(
        new Error("API request timed out after 8000ms: /api/v1/discovery/stats/content"),
        "Failed to load stats."
      )
    ).toBe("This is taking longer than usual. Try again in a moment.");
  });

  it("prefers the contextual fallback for non-rate-limit API errors", () => {
    const error = new ApiError({
      status: 500,
      message: "API 500: boom",
      path: "/api/v1/x",
    });
    expect(toUserFacingErrorMessage(error, "Request failed.")).toBe("Request failed.");
  });

  it("falls back when the error has no useful mapping", () => {
    expect(toUserFacingErrorMessage({}, "Request failed.")).toBe("Request failed.");
    expect(toUserFacingErrorMessage(new Error("   "), "Request failed.")).toBe("Request failed.");
  });
});

describe("toDevErrorDetail", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns undefined in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const error = new ApiError({
      status: 500,
      message: "API 500: boom",
      path: "/api/v1/x",
      requestId: "rid",
    });
    expect(toDevErrorDetail(error)).toBeUndefined();
  });

  it("includes request id and path in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    const error = new ApiError({
      status: 500,
      message: "API 500: boom",
      path: "/api/v1/x",
      requestId: "rid",
    });
    expect(toDevErrorDetail(error)).toContain("request_id: rid");
    expect(toDevErrorDetail(error)).toContain("path: /api/v1/x");
  });
});

describe("summarizeLoadErrors", () => {
  it("returns undefined for empty input", () => {
    expect(summarizeLoadErrors([])).toBeUndefined();
    expect(summarizeLoadErrors([null, "", undefined])).toBeUndefined();
  });

  it("returns a single unique message as-is", () => {
    expect(summarizeLoadErrors(["Failed to load relay stats."])).toBe(
      "Failed to load relay stats."
    );
  });

  it("deduplicates identical messages", () => {
    expect(
      summarizeLoadErrors(["Failed to load windowed trends.", "Failed to load windowed trends."])
    ).toBe("Failed to load windowed trends.");
  });

  it("collapses multiple distinct failures into a refresh note", () => {
    expect(
      summarizeLoadErrors(["Failed to load relay stats.", "Failed to load relay health."])
    ).toBe("Some sections are refreshing. Available data is shown below.");
  });
});
