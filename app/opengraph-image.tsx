import { createOgImage, ogContentType, ogSize } from "@/lib/og/template";

export const runtime = "nodejs";
export const size = ogSize;
export const contentType = ogContentType;

export default async function OpenGraphImage() {
  return createOgImage({
    eyebrow: "NOSTRMASH",
    title: "Explore the Nostr network",
    subtitle: "Search, trends, profiles, and relay health in one place.",
    variant: "default",
    titleSize: 72,
  });
}
