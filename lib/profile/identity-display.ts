import type { ProfileIdentity } from "@/lib/types/api";

export type Nip05Hint = "verified" | "unverified" | "unreachable" | "blocked";

export interface IdentityField {
  label: string;
  value: string;
  hint?: Nip05Hint;
}

const UNVERIFIED_STATUSES = new Set(["mismatch", "not_found", "invalid"]);

/** Verified only when the boolean is true. Pending and blank statuses stay quiet. */
export function nip05Hint(identity: {
  nip05_verified?: boolean;
  nip05_status?: string;
}): Nip05Hint | null {
  if (identity.nip05_verified === true) return "verified";
  const status = identity.nip05_status ?? "";
  if (UNVERIFIED_STATUSES.has(status)) return "unverified";
  if (status === "unreachable") return "unreachable";
  if (status === "blocked") return "blocked";
  return null;
}

export function visibleIdentityFields(identity: ProfileIdentity): IdentityField[] {
  const fields: IdentityField[] = [];
  const hint = nip05Hint(identity);
  if ((identity.nip05 && identity.nip05.length > 0) || hint) {
    fields.push({ label: "NIP-05", value: identity.nip05 ?? "", hint: hint ?? undefined });
  }
  if (identity.nip05_domain) {
    fields.push({ label: "NIP-05 domain", value: identity.nip05_domain });
  }
  if (identity.lud16_domain) {
    fields.push({ label: "Lightning address domain", value: identity.lud16_domain });
  } else if (identity.lud16) {
    fields.push({ label: "Lightning address", value: identity.lud16 });
  }
  if (identity.website_domain) {
    fields.push({ label: "Website domain", value: identity.website_domain });
  }
  if (typeof identity.completeness_score === "number") {
    fields.push({
      label: "Completeness",
      value: `${identity.completeness_score.toLocaleString()} of 8`,
    });
  }
  if (typeof identity.accepts_nutzaps === "boolean") {
    fields.push({ label: "Accepts nutzaps", value: identity.accepts_nutzaps ? "Yes" : "No" });
  }
  return fields.filter((field) => field.value.length > 0 || field.hint);
}

export function analyticsWindowLabel(window: string | undefined): string {
  if (window === "7d") return "Last 7 days";
  if (window === "30d") return "Last 30 days";
  if (window === "90d") return "Last 90 days";
  if (window === "24h" || window === "1d") return "Last 24 hours";
  return window && window.length > 0 ? window : "Window";
}
