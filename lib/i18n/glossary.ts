export const GLOSSARY = {
  trust: {
    gloss:
      "Distance through follows from a small set of seed accounts. It is not a judgment of the person.",
    href: "/methodology#trust",
  },
  seed: {
    gloss: "A seed account anchors the trust graph. It is not a rank of who is worth reading.",
    href: "/methodology#trust",
  },
  hop: {
    gloss: "How many follows separate this account from a seed account.",
    href: "/methodology#trust",
  },
  trusted: {
    gloss: "Share of engagement from accounts the trust graph can reach.",
    href: "/methodology#trust",
  },
  nevent: {
    gloss: "A nevent is a shareable Nostr identifier for this note.",
    href: "/methodology#identifiers",
  },
} as const;

export type GlossaryId = keyof typeof GLOSSARY;
