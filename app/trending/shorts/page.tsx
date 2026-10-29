import { MediaRankingPage, mediaRankingMetadata } from "@/components/discover/media-ranking-page";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export function generateMetadata({ searchParams }: { searchParams: SearchParams }) {
  return mediaRankingMetadata("shorts", searchParams);
}

export default function TrendingShortsPage({ searchParams }: { searchParams: SearchParams }) {
  return <MediaRankingPage format="shorts" searchParams={searchParams} />;
}
