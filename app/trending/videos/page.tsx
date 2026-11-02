import { MediaRankingPage, mediaRankingMetadata } from "@/components/discover/media-ranking-page";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export function generateMetadata({ searchParams }: { searchParams: SearchParams }) {
  return mediaRankingMetadata("videos", searchParams);
}

export default function TrendingVideosPage({ searchParams }: { searchParams: SearchParams }) {
  return <MediaRankingPage format="videos" searchParams={searchParams} />;
}
