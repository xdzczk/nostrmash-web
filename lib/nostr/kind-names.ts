export type KindInfo = {
  name: string;
  nip?: string;
};

const EXACT: Record<number, KindInfo> = {
  0: { name: "Profile", nip: "01" },
  1: { name: "Note", nip: "01" },
  3: { name: "Follows", nip: "02" },
  4: { name: "Legacy DM", nip: "04" },
  5: { name: "Deletion", nip: "09" },
  6: { name: "Repost", nip: "18" },
  7: { name: "Reaction", nip: "25" },
  8: { name: "Badge award", nip: "58" },
  9: { name: "Group chat", nip: "29" },
  11: { name: "Group thread", nip: "29" },
  16: { name: "Generic repost", nip: "18" },
  20: { name: "Picture", nip: "68" },
  21: { name: "Video", nip: "71" },
  22: { name: "Short video", nip: "71" },
  1018: { name: "Poll response", nip: "88" },
  1059: { name: "Gift wrap", nip: "59" },
  1063: { name: "File metadata", nip: "94" },
  1068: { name: "Poll", nip: "88" },
  1111: { name: "Comment", nip: "22" },
  1311: { name: "Live chat", nip: "53" },
  1621: { name: "Git issue", nip: "34" },
  1622: { name: "Git reply", nip: "34" },
  1984: { name: "Report", nip: "56" },
  1985: { name: "Label", nip: "32" },
  4550: { name: "Group post approval", nip: "72" },
  7000: { name: "DVM feedback", nip: "90" },
  9041: { name: "Zap goal", nip: "75" },
  9321: { name: "Nutzap", nip: "61" },
  9734: { name: "Zap request", nip: "57" },
  9735: { name: "Zap receipt", nip: "57" },
  9802: { name: "Highlight", nip: "84" },
  10000: { name: "Mute list", nip: "51" },
  10001: { name: "Pins", nip: "51" },
  10002: { name: "Relay list", nip: "65" },
  10003: { name: "Bookmarks", nip: "51" },
  10006: { name: "Blocked relays", nip: "51" },
  10007: { name: "Search relays", nip: "51" },
  10009: { name: "Groups", nip: "51" },
  10012: { name: "Favourite relays", nip: "51" },
  10013: { name: "Private relays", nip: "51" },
  10096: { name: "File storage servers", nip: "96" },
  10015: { name: "Interests", nip: "51" },
  10019: { name: "Nutzap info", nip: "61" },
  10030: { name: "Emoji list", nip: "51" },
  10050: { name: "DM relays", nip: "17" },
  10063: { name: "Media servers", nip: "96" },
  10166: { name: "Relay monitor", nip: "66" },
  13194: { name: "Wallet info", nip: "47" },
  30000: { name: "Follow set", nip: "51" },
  30004: { name: "Curation set", nip: "51" },
  30005: { name: "Curation set", nip: "51" },
  30008: { name: "Badge definition", nip: "58" },
  30009: { name: "Badge collection", nip: "58" },
  30015: { name: "Interest set", nip: "51" },
  30023: { name: "Article", nip: "23" },
  30040: { name: "Publication index" },
  30041: { name: "Publication section" },
  30402: { name: "Classified listing", nip: "99" },
  30617: { name: "Git repository", nip: "34" },
  30618: { name: "Git state", nip: "34" },
  30030: { name: "Emoji set", nip: "30" },
  30166: { name: "Relay discovery", nip: "66" },
  30311: { name: "Live event", nip: "53" },
  30315: { name: "User status", nip: "38" },
  30818: { name: "Wiki", nip: "54" },
  31922: { name: "Calendar event", nip: "52" },
  31923: { name: "Calendar time", nip: "52" },
  31925: { name: "Calendar RSVP", nip: "52" },
  34235: { name: "Video", nip: "71" },
  34236: { name: "Short video", nip: "71" },
  34550: { name: "Community", nip: "72" },
};

/** NIP-34 status events. The kind number picks the status word. */
const GIT_STATUS: Record<number, string> = {
  1630: "open",
  1631: "applied",
  1632: "closed",
  1633: "draft",
};

/** NIP-29 moderation actions. Kinds in 9000–9021 without a row stay "Group admin". */
const GROUP_ADMIN: Record<number, string> = {
  9000: "add user",
  9001: "remove user",
  9002: "edit metadata",
  9005: "delete event",
  9007: "create group",
  9008: "delete group",
  9009: "create invite",
  9010: "edit pins",
  9021: "join request",
  9022: "leave request",
};

/** Human name for a kind number. Unknown kinds stay "Kind N". */
export function kindInfo(kind: number): KindInfo & { known: boolean } {
  const exact = EXACT[kind];
  if (exact) return { ...exact, known: true };
  const gitStatus = GIT_STATUS[kind];
  if (gitStatus) return { name: `Git status: ${gitStatus}`, nip: "34", known: true };
  if ((kind >= 9000 && kind <= 9021) || kind === 9022) {
    const action = GROUP_ADMIN[kind];
    return {
      name: action ? `Group admin: ${action}` : "Group admin",
      nip: "29",
      known: true,
    };
  }
  if (kind >= 5000 && kind <= 5999) return { name: "DVM request", nip: "90", known: true };
  if (kind >= 6000 && kind <= 6999) return { name: "DVM result", nip: "90", known: true };
  if (kind >= 39000 && kind <= 39003) return { name: "Group metadata", nip: "29", known: true };
  return { name: `Kind ${kind}`, known: false };
}

const KIND_PAGES: Partial<Record<number, string>> = {
  0: "/trending/profiles",
  1: "/trending/notes",
  30023: "/trending/long-form",
};

export function kindFilterHref(kind: number): string | undefined {
  return KIND_PAGES[kind];
}
