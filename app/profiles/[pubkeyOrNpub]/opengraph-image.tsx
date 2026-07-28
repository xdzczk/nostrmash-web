import { getProfileSummary } from "@/lib/api/endpoints";
import { createOgImage, ogContentType, ogSize } from "@/lib/og/template";
import { isValidPubkeyOrNpubParam, resolvePubkeyParam } from "@/lib/routing/params";

export const runtime = "nodejs";
export const size = ogSize;
export const contentType = ogContentType;

type Params = Promise<{ pubkeyOrNpub: string }>;

export default async function ProfileOpenGraphImage({ params }: { params: Params }) {
  const { pubkeyOrNpub } = await params;
  let name = pubkeyOrNpub.slice(0, 24);
  let about = "Nostr profile on NostrMash";

  if (isValidPubkeyOrNpubParam(pubkeyOrNpub)) {
    const pubkey = resolvePubkeyParam(pubkeyOrNpub) ?? pubkeyOrNpub;
    try {
      const summary = await getProfileSummary(pubkey, "shortTtl");
      const profile =
        (summary as { profile?: Record<string, unknown> }).profile ??
        (summary as unknown as Record<string, unknown>);
      name =
        (typeof profile?.display_name === "string" && profile.display_name) ||
        (typeof profile?.name === "string" && profile.name) ||
        name;
      about = (typeof profile?.about === "string" && profile.about.slice(0, 160)) || about;
    } catch {
      // defaults
    }
  }

  return createOgImage({
    eyebrow: "NOSTRMASH · PROFILE",
    title: name,
    subtitle: about,
    variant: "profile",
    titleSize: 64,
  });
}
