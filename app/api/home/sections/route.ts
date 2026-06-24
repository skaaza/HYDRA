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

const CURRENT_YEAR = new Date().getFullYear()
const MIN_VOTES = 100

async function fetchMediaSection(mediaType: MediaType, sortBy: string, minVotes = MIN_VOTES) {
  const genresById = await getGenreMap(mediaType)
  const data = await tmdbFetch<{ results?: TmdbMovie[] | TmdbTv[] }>(`/discover/${mediaType}`, {
    include_adult: false,
    include_video: mediaType === "movie" ? false : undefined,
    language: "en-US",
    page: 1,
    sort_by: sortBy,
    [dateParam(mediaType, "lte")]: `${CURRENT_YEAR}-12-31`,
    "vote_count.gte": minVotes,
  })

  if (mediaType === "movie") {
    return ((data.results || []) as TmdbMovie[])
      .filter((movie) => movie.poster_path && !movie.video)
      .map((movie) => normalizeMovie(movie, genresById))
      .slice(0, 10)
  }

  return ((data.results || []) as TmdbTv[])
    .filter((show) => show.poster_path)
    .map((show) => normalizeTv(show, genresById))
    .slice(0, 10)
}

async function fetchSection(movieSortBy: string, tvSortBy: string, minVotes = MIN_VOTES) {
  const [movies, shows] = await Promise.all([
    fetchMediaSection("movie", movieSortBy, minVotes),
    fetchMediaSection("tv", tvSortBy, minVotes),
  ])

  return [...movies, ...shows].sort((a, b) => (b.rating?.voteCount || 0) - (a.rating?.voteCount || 0)).slice(0, 10)
}

export async function GET() {
  if (!hasTmdbCredentials()) {
    return NextResponse.json({ latest: [], rated: [], watched: [], ...tmdbCredentialError() })
  }

  const [latestResult, ratedResult, watchedResult] = await Promise.allSettled([
    fetchSection("primary_release_date.desc", "first_air_date.desc", MIN_VOTES),
    fetchSection("vote_average.desc", "vote_average.desc", 1000),
    fetchSection("popularity.desc", "popularity.desc", MIN_VOTES),
  ])

  const errors = [latestResult, ratedResult, watchedResult]
    .filter((result) => result.status === "rejected")
    .map((result) => (result as PromiseRejectedResult).reason)

  if (errors.length > 0) {
    console.error("Home sections API partial failure:", errors)
  }

  return NextResponse.json({
    latest: latestResult.status === "fulfilled" ? latestResult.value : [],
    rated: ratedResult.status === "fulfilled" ? ratedResult.value : [],
    watched: watchedResult.status === "fulfilled" ? watchedResult.value : [],
    ...(errors.length > 0 ? { error: "Some home sections failed to load" } : {}),
  })
}
