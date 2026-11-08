import { describe, expect, it } from "vitest";

import { coverageStory, offlineRelayNote } from "@/lib/relays/coverage";

describe("coverage", () => {
  it("describes offline relays as shut down, including accounts that still list them", () => {
    const story = coverageStory({
      listed: [
        { host: "relay.primal.net", distinctUsers: 800, indexed: true },
        { host: "relay.damus.io", distinctUsers: 2100, indexed: false },
      ],
    });
    expect(story).toContain("1 of the 2 most-listed relays");
    expect(story).toContain("relay.damus.io is still listed by 2,100 accounts and is offline.");
    expect(story).not.toMatch(/not indexed/i);
  });

  it("says a note was not checked on relays that are offline", () => {
    expect(offlineRelayNote(["relay.primal.net"])).toMatch(/offline and unresponsive/);
    expect(offlineRelayNote(["relay.damus.io", "relay.mostr.pub"])).toBeNull();
  });
});
