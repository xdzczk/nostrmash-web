import type { EventRecord } from "@/lib/types/api";

import { formatUrlForDisplay } from "@/components/explorer/utils";

export type NotePreviewMode =
  | "standard_text_preview"
  | "media_led_preview"
  | "link_led_preview"
  | "config_raw_data_preview"
  | "long_identifier_heavy_preview";

export interface NotePreviewPresentation {
  mode: NotePreviewMode;
  isCompact: boolean;
  containsRaw: boolean;
  firstLine?: string;
  domains: string[];
  contentForCard: string;
  rawContent: string;
  prefersMediaFirst: boolean;
  treatmentLabel?: string;
}

const URL_PATTERN = /https?:\/\/\S+/g;
const MEDIA_EXTENSION_PATTERN =
  /\.(jpg|jpeg|png|gif|webp|avif|svg|mp4|webm|mov|m4v|m3u8)(\?[^\s]*)?$/i;
const BECH32_TOKEN_PATTERN =
  /\b(?:note|nevent|nprofile|npub|nsec|naddr|nrelay)1[023456789acdefghjklmnpqrstuvwxyz]{20,}\b/i;
const HEX_TOKEN_PATTERN = /\b[a-f0-9]{48,}\b/i;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function extractNotePreviewPayload(note: EventRecord): Record<string, unknown> | null {
  const raw = asRecord((note as Record<string, unknown>).preview);
  return raw;
}

function extractUrls(value: string): string[] {
  const matches = value.match(URL_PATTERN) ?? [];
  return Array.from(
    new Set(
      matches.map((match) => match.replace(/[),.;!?]+$/g, "")).filter((match) => match.length > 0)
    )
  );
}

function extractDomains(urls: string[]): string[] {
  const domains = urls
    .map((rawUrl) => {
      try {
        const url = new URL(rawUrl);
        return url.hostname.toLowerCase().replace(/^www\./, "");
      } catch {
        return null;
      }
    })
    .filter((domain): domain is string => typeof domain === "string" && domain.length > 0);
  return Array.from(new Set(domains));
}

function normalizeLinksForDisplay(value: string): string {
  return value.replace(URL_PATTERN, (match) => formatUrlForDisplay(match, "secondary"));
}

function clampText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function firstNonEmptyLine(value: string): string | undefined {
  const line = value
    .split("\n")
    .map((entry) => entry.trim())
    .find((entry) => entry.length > 0);
  return line ? clampText(normalizeLinksForDisplay(line), 140) : undefined;
}

function hasMediaUrls(urls: string[]): boolean {
  return urls.some((url) => MEDIA_EXTENSION_PATTERN.test(url));
}

function isUrlHeavy(content: string, urls: string[]): boolean {
  if (urls.length === 0 || content.length === 0) return false;
  const urlChars = urls.reduce((total, url) => total + url.length, 0);
  const ratio = urlChars / content.length;
  return urls.length >= 3 || ratio >= 0.45;
}

function isConfigLike(content: string, urls: string[]): boolean {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length < 3) return false;
  const kvLines = lines.filter((line) => line.includes(":") || line.includes("=")).length;
  const braceLines = lines.filter((line) => /[{}\[\]]/.test(line)).length;
  const relayLines = lines.filter((line) => /wss:\/\//i.test(line)).length;
  if (relayLines >= 3) return true;
  if (kvLines >= 3 && (braceLines >= 2 || relayLines >= 2)) return true;
  if ((content.startsWith("{") || content.startsWith("[")) && urls.length >= 2 && braceLines >= 2) {
    return true;
  }
  return false;
}

function isIdentifierHeavy(content: string): boolean {
  const tokens = content.split(/\s+/).filter((token) => token.length > 0);
  if (tokens.length === 0) return false;
  const veryLongToken = tokens.some((token) => token.length >= 128);
  if (veryLongToken) return true;
  const longIdentifierRuns = tokens.filter((token) => {
    const cleaned = token.replace(/[^a-z0-9_-]/gi, "");
    if (cleaned.length < 64) return false;
    const identifierRuneCount = cleaned.split("").filter((char) => /[a-z0-9_-]/i.test(char)).length;
    return identifierRuneCount / cleaned.length >= 0.9;
  }).length;
  if (longIdentifierRuns >= 2) return true;
  const bech32Matches = content.match(new RegExp(BECH32_TOKEN_PATTERN, "gi")) ?? [];
  const hexMatches = content.match(new RegExp(HEX_TOKEN_PATTERN, "gi")) ?? [];
  return bech32Matches.length >= 2 || hexMatches.length >= 3;
}

function buildCompactSummary(
  label: string,
  firstLine: string | undefined,
  domains: string[]
): string {
  const pieces: string[] = [label];
  if (domains.length > 0) {
    pieces.push(`from ${domains.slice(0, 2).join(", ")}`);
  }
  if (firstLine) {
    pieces.push(`"${firstLine}"`);
  }
  return pieces.join(" — ");
}

function classifyFallback(content: string): NotePreviewPresentation {
  const urls = extractUrls(content);
  const domains = extractDomains(urls);
  const firstLine = firstNonEmptyLine(content);
  const mediaLed = hasMediaUrls(urls);
  const configLike = isConfigLike(content, urls);
  const identifierHeavy = isIdentifierHeavy(content);
  const urlHeavy = isUrlHeavy(content, urls);
  const normalized = normalizeLinksForDisplay(content.replace(/\n{3,}/g, "\n\n")).trim();

  if (configLike) {
    return {
      mode: "config_raw_data_preview",
      isCompact: true,
      containsRaw: true,
      firstLine,
      domains,
      contentForCard: buildCompactSummary("Raw config-like note", firstLine, domains),
      rawContent: content,
      prefersMediaFirst: false,
      treatmentLabel: "Compact raw preview",
    };
  }

  if (identifierHeavy) {
    return {
      mode: "long_identifier_heavy_preview",
      isCompact: true,
      containsRaw: true,
      firstLine,
      domains,
      contentForCard: buildCompactSummary("Identifier-heavy note", firstLine, domains),
      rawContent: content,
      prefersMediaFirst: false,
      treatmentLabel: "Compact technical preview",
    };
  }

  if (mediaLed) {
    return {
      mode: "media_led_preview",
      isCompact: false,
      containsRaw: false,
      firstLine,
      domains,
      contentForCard: clampText(normalized, 280),
      rawContent: content,
      prefersMediaFirst: true,
      treatmentLabel: "Media-led",
    };
  }

  if (urlHeavy) {
    return {
      mode: "link_led_preview",
      isCompact: false,
      containsRaw: false,
      firstLine,
      domains,
      contentForCard: clampText(normalized, 220),
      rawContent: content,
      prefersMediaFirst: false,
      treatmentLabel: "Link-led",
    };
  }

  return {
    mode: "standard_text_preview",
    isCompact: false,
    containsRaw: false,
    firstLine,
    domains,
    contentForCard: content,
    rawContent: content,
    prefersMediaFirst: false,
  };
}

export function getNotePreviewPresentation(note: EventRecord): NotePreviewPresentation {
  const content = typeof note.content === "string" ? note.content.trim() : "";
  if (content.length === 0) {
    return {
      mode: "standard_text_preview",
      isCompact: false,
      containsRaw: false,
      firstLine: undefined,
      domains: [],
      contentForCard: "(no content)",
      rawContent: "",
      prefersMediaFirst: false,
    };
  }

  const fallback = classifyFallback(content);
  const previewPayload = extractNotePreviewPayload(note);
  if (!previewPayload) return fallback;

  const mode = asString(previewPayload.mode) as NotePreviewMode | undefined;
  const displayContent = asString(previewPayload.display_content);
  const firstLine = asString(previewPayload.first_line) ?? fallback.firstLine;
  const domains = asStringArray(previewPayload.domains);
  const isCompact = asBoolean(previewPayload.is_compact) ?? fallback.isCompact;
  const containsRaw = asBoolean(previewPayload.contains_raw) ?? fallback.containsRaw;
  const resolvedMode = mode ?? fallback.mode;
  const normalizedDisplay = displayContent
    ? clampText(
        normalizeLinksForDisplay(displayContent),
        resolvedMode === "standard_text_preview" ? 500 : 280
      )
    : fallback.contentForCard;

  const treatmentLabel =
    resolvedMode === "config_raw_data_preview"
      ? "Compact raw preview"
      : resolvedMode === "long_identifier_heavy_preview"
        ? "Compact technical preview"
        : resolvedMode === "link_led_preview"
          ? "Link-led"
          : resolvedMode === "media_led_preview"
            ? "Media-led"
            : undefined;

  return {
    mode: resolvedMode,
    isCompact,
    containsRaw,
    firstLine,
    domains: domains.length > 0 ? domains : fallback.domains,
    contentForCard: normalizedDisplay,
    rawContent: content,
    prefersMediaFirst: resolvedMode === "media_led_preview" || fallback.prefersMediaFirst,
    treatmentLabel,
  };
}
