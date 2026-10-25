import { describe, expect, it } from "vitest";

import { indexMembershipNote } from "@/lib/relays/index-membership";

describe("indexMembershipNote", () => {
  it("stays quiet when the relay is in the index", () => {
    expect(indexMembershipNote("active", true)).toBeNull();
    expect(indexMembershipNote("pinned", true)).toBeNull();
  });

  it("names the exceptions", () => {
    expect(indexMembershipNote("inactive", true)).toBe("Not in our index");
    expect(indexMembershipNote(undefined, false)).toBe("Not in our index");
    expect(indexMembershipNote("probation", true)).toBe("On probation in our index");
    expect(indexMembershipNote("candidate", true)).toBe("Queued for our index");
    expect(indexMembershipNote("blocked", true)).toBe("Blocked from our index");
  });
});
