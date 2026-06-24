import { NextResponse } from "next/server"
import {
  dateParam,
  getGenreMap,
  hasTmdbCredentials,
  MediaType,
  normalizeMovie,
  normalizeTv,
  tmdbCredentialError,
  tmdbFetch,
  TmdbMovie,
  TmdbTv,
} from "@/lib/tmdb"

export const dynamic = "force-dynamic"

async function fetchLatest(mediaType: MediaType) {
  const genresById = await getGenreMap(mediaType)
  const data = await tmdbFetch<{ results?: TmdbMovie[] | TmdbTv[] }>(`/discover/${mediaType}`, {
    include_adult: false,
    include_video: mediaType === "movie" ? false : undefined,
    language: "en-US",
    page: 1,
    sort_by: mediaType === "movie" ? "primary_release_date.desc" : "first_air_date.desc",
    [dateParam(mediaType, "lte")]: `${new Date().getFullYear()}-12-31`,
    "vote_count.gte": 100,
  })

  if (mediaType === "movie") {
    return ((data.results || []) as TmdbMovie[])
      .filter((movie) => movie.poster_path && !movie.video)
      .map((movie) => normalizeMovie(movie, genresById))
  }

  return ((data.results || []) as TmdbTv[]).filter((show) => show.poster_path).map((show) => normalizeTv(show, genresById))
}

export async function GET() {
  if (!hasTmdbCredentials()) {
    return NextResponse.json({ titles: [], ...tmdbCredentialError() }, { status: 500 })
  }

  try {
    const [movies, shows] = await Promise.all([fetchLatest("movie"), fetchLatest("tv")])
    const titles = [...movies, ...shows].sort((a, b) => (b.startYear || 0) - (a.startYear || 0)).slice(0, 10)

    return NextResponse.json({ titles })
  } catch (error) {
    console.error("Latest API error:", error)
    return NextResponse.json({ titles: [], error: "Failed to fetch latest titles" }, { status: 500 })
  }
}
