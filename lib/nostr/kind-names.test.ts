import { describe, expect, it } from "vitest";

import { kindInfo } from "@/lib/nostr/kind-names";

describe("kindInfo", () => {
  it("names the kinds the index actually sees", () => {
    expect(kindInfo(20).name).toBe("Picture");
    expect(kindInfo(21).name).toBe("Video");
    expect(kindInfo(22).name).toBe("Short video");
    expect(kindInfo(1059)).toMatchObject({ name: "Gift wrap", nip: "59" });
    expect(kindInfo(1621).name).toBe("Git issue");
    expect(kindInfo(1622).name).toBe("Git reply");
    expect(kindInfo(1630).name).toBe("Git status: open");
    expect(kindInfo(1631).name).toBe("Git status: applied");
    expect(kindInfo(1632).name).toBe("Git status: closed");
    expect(kindInfo(1633).name).toBe("Git status: draft");
    expect(kindInfo(9000).name).toBe("Group admin: add user");
    expect(kindInfo(9001).name).toBe("Group admin: remove user");
    expect(kindInfo(9002).name).toBe("Group admin: edit metadata");
    expect(kindInfo(9004).name).toBe("Group admin");
    expect(kindInfo(9021).name).toBe("Group admin: join request");
    expect(kindInfo(9321).name).toBe("Nutzap");
    expect(kindInfo(30040).name).toBe("Publication index");
    expect(kindInfo(30041).name).toBe("Publication section");
    expect(kindInfo(30402).name).toBe("Classified listing");
    expect(kindInfo(30617).name).toBe("Git repository");
    expect(kindInfo(30618).name).toBe("Git state");
    expect(kindInfo(31925).name).toBe("Calendar RSVP");
    expect(kindInfo(34235).name).toBe("Video");
    expect(kindInfo(34236).name).toBe("Short video");
    expect(kindInfo(10013).name).toBe("Private relays");
    expect(kindInfo(10096).name).toBe("File storage servers");
    expect(kindInfo(1).known).toBe(true);
    expect(kindInfo(99999).name).toBe("Kind 99999");
  });
});
