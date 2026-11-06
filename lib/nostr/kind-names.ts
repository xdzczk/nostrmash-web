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
  1018: { name: "Poll response", nip: "88" },
  1063: { name: "File metadata", nip: "94" },
  1068: { name: "Poll", nip: "88" },
  1111: { name: "Comment", nip: "22" },
  1311: { name: "Live chat", nip: "53" },
  1984: { name: "Report", nip: "56" },
  1985: { name: "Label", nip: "32" },
  4550: { name: "Group post approval", nip: "72" },
  7000: { name: "DVM feedback", nip: "90" },
  9041: { name: "Zap goal", nip: "75" },
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
  30030: { name: "Emoji set", nip: "30" },
  30166: { name: "Relay discovery", nip: "66" },
  30311: { name: "Live event", nip: "53" },
  30315: { name: "User status", nip: "38" },
  30818: { name: "Wiki", nip: "54" },
  31922: { name: "Calendar event", nip: "52" },
  31923: { name: "Calendar time", nip: "52" },
  34550: { name: "Community", nip: "72" },
};

/** Human name for a kind number. Unknown kinds stay "Kind N". */
export function kindInfo(kind: number): KindInfo & { known: boolean } {
  const exact = EXACT[kind];
  if (exact) return { ...exact, known: true };
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
