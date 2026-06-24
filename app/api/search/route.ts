import { NextResponse } from "next/server"
import {
  getGenreMap,
  hasTmdbCredentials,
  normalizeMovie,
  normalizeTv,
  tmdbCredentialError,
  tmdbFetch,
  TmdbMovie,
  TmdbTv,
} from "@/lib/tmdb"

type MultiSearchItem =
  | (TmdbMovie & { media_type: "movie" })
  | (TmdbTv & { media_type: "tv" })
  | { media_type?: string }

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("query")

  if (!query) {
    return NextResponse.json({ error: "Query parameter is required" }, { status: 400 })
  }

  if (!hasTmdbCredentials()) {
    return NextResponse.json({ titles: [], ...tmdbCredentialError() }, { status: 500 })
  }

  try {
    const [data, movieGenresById, tvGenresById] = await Promise.all([
      tmdbFetch<{ page: number; results?: MultiSearchItem[]; total_pages: number; total_results: number }>("/search/multi", {
        query,
        include_adult: false,
        language: "en-US",
        page: searchParams.get("page") || 1,
      }),
      getGenreMap("movie").catch(() => new Map<number, string>()),
      getGenreMap("tv").catch(() => new Map<number, string>()),
    ])

    const titles = (data.results || [])
      .flatMap((item) => {
        if (item.media_type === "movie" && !(item as TmdbMovie).video) {
          return [normalizeMovie(item as TmdbMovie, movieGenresById)]
        }
        if (item.media_type === "tv") {
          return [normalizeTv(item as TmdbTv, tvGenresById)]
        }
        return []
      })
      .sort((a, b) => (b.rating?.voteCount || 0) - (a.rating?.voteCount || 0))

    return NextResponse.json({
      titles,
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results,
    })
  } catch (error) {
    console.error("TMDB search error:", error)
    return NextResponse.json({ titles: [], error: "Failed to fetch titles" }, { status: 500 })
  }
}
