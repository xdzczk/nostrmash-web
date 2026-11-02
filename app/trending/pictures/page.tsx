import { MediaRankingPage, mediaRankingMetadata } from "@/components/discover/media-ranking-page";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export function generateMetadata({ searchParams }: { searchParams: SearchParams }) {
  return mediaRankingMetadata("pictures", searchParams);
}

export default function TrendingPicturesPage({ searchParams }: { searchParams: SearchParams }) {
  return <MediaRankingPage format="pictures" searchParams={searchParams} />;
}
