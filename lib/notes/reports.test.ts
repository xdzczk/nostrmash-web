import { describe, expect, it } from "vitest";

import { normalizeReportRecord, reportTypeFromTags } from "@/lib/notes/reports";

const EVENT_ID = "a".repeat(64);
const REPORTER = "b".repeat(64);

describe("reportTypeFromTags", () => {
  it("uses the last non-address element of an e tag", () => {
    expect(reportTypeFromTags([["e", EVENT_ID, "wss://relay.example", "spam"]])).toBe("spam");
    expect(reportTypeFromTags([["p", REPORTER, "impersonation"]])).toBe("impersonation");
    expect(reportTypeFromTags([["e", EVENT_ID, "not-a-type"]])).toBe("other");
  });
});

describe("normalizeReportRecord", () => {
  it("reads a structured report target", () => {
    expect(
      normalizeReportRecord({
        report_event_id: "c".repeat(64),
        reporter_pubkey: REPORTER,
        report_type: "spam",
        content: "This note was reported as spam in the mock index.",
        created_at: 1_700_000_500,
      })
    ).toMatchObject({
      id: "c".repeat(64),
      reporter_pubkey: REPORTER,
      report_type: "spam",
      content: "This note was reported as spam in the mock index.",
    });
  });

  it("reads a raw kind 1984 event", () => {
    expect(
      normalizeReportRecord({
        id: "d".repeat(64),
        pubkey: REPORTER,
        kind: 1984,
        content: "reason",
        tags: [["e", EVENT_ID, "malware"]],
      })?.report_type
    ).toBe("malware");
  });
});
