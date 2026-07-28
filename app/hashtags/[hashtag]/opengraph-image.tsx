import { createOgImage, ogContentType, ogSize } from "@/lib/og/template";

export const runtime = "nodejs";
export const size = ogSize;
export const contentType = ogContentType;

type Params = Promise<{ hashtag: string }>;

export default async function HashtagOpenGraphImage({ params }: { params: Params }) {
  const { hashtag } = await params;
  const tag = decodeURIComponent(hashtag).replace(/^#/, "");

  return createOgImage({
    eyebrow: "NOSTRMASH · HASHTAG",
    title: `#${tag}`,
    subtitle: "Trending notes and activity for this topic",
    variant: "hashtag",
    titleSize: 84,
  });
}
