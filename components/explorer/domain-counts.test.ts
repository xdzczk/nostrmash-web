import { describe, expect, it } from "vitest";

import { pickPrimaryDomainSupportingSignal } from "./domain-supporting-signal";
import { domainHeadlineCount } from "./utils";

describe("domainHeadlineCount", () => {
  it("prefers link_count from current discovery payloads", () => {
    expect(
      domainHeadlineCount({ domain: "youtube.com", link_count: 596, note_count: 566, count: 3 })
    ).toBe(596);
  });

  it("falls back through legacy count fields", () => {
    expect(domainHeadlineCount({ domain: "a.com", count: 8 })).toBe(8);
    expect(domainHeadlineCount({ domain: "a.com", event_count: 5 })).toBe(5);
    expect(domainHeadlineCount({ domain: "a.com", note_count: 2 })).toBe(2);
  });

  it("returns undefined when no positive count exists", () => {
    expect(domainHeadlineCount({ domain: "a.com" })).toBeUndefined();
    expect(domainHeadlineCount({ domain: "a.com", link_count: 0, count: 0 })).toBeUndefined();
  });
});

describe("pickPrimaryDomainSupportingSignal", () => {
  it("surfaces link_count when it is the strongest signal", () => {
    expect(
      pickPrimaryDomainSupportingSignal({ domain: "x.com", link_count: 40, unique_authors: 12 })
    ).toMatchObject({ key: "link_count", value: 40, valueLabel: "40 links" });
  });

  it("uses note_count as the linked-notes fallback", () => {
    expect(pickPrimaryDomainSupportingSignal({ domain: "x.com", note_count: 9 })).toMatchObject({
      key: "event_count",
      value: 9,
      valueLabel: "9 notes",
    });
  });
});
