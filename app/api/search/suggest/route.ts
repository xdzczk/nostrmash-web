import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { appConfig } from "@/lib/config";

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  const limit = request.nextUrl.searchParams.get("limit") ?? "8";
  if (q.length < 2) {
    return NextResponse.json({ profiles: [], hashtags: [] });
  }

  const base = appConfig.apiBaseUrl.replace(/\/$/, "");
  const url = `${base}/api/v1/search/suggest?q=${encodeURIComponent(q)}&limit=${encodeURIComponent(limit)}`;

  try {
    const upstream = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 10 },
    });

    if (!upstream.ok) {
      return NextResponse.json({ profiles: [], hashtags: [] }, { status: upstream.status });
    }

    const body: unknown = await upstream.json();
    return NextResponse.json(body, {
      headers: { "Cache-Control": "public, max-age=10, stale-while-revalidate=20" },
    });
  } catch {
    return NextResponse.json({ profiles: [], hashtags: [] }, { status: 502 });
  }
}
