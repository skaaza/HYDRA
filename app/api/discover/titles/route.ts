import { NextResponse } from "next/server"
import {
  dateParam,
  getGenreMap,
  hasTmdbCredentials,
  MediaType,
  normalizeMovie,
  normalizeTv,
  sortToTmdb,
  tmdbCredentialError,
  tmdbFetch,
  TmdbMovie,
  TmdbTv,
} from "@/lib/tmdb"

const CURRENT_YEAR = new Date().getFullYear()
const MIN_VOTES = 100

type DiscoverResult =
  | Awaited<ReturnType<typeof fetchDiscoverMedia<"movie">>>
  | Awaited<ReturnType<typeof fetchDiscoverMedia<"tv">>>

function requestedMediaTypes(value: string | null): MediaType[] {
  if (!value || value === "ALL") return ["movie", "tv"]
  if (value === "MOVIE") return ["movie"]
  if (value === "TV_SERIES" || value === "TVSERIES") return ["tv"]
  return []
}

function parsePageToken(token: string | null, mediaType: MediaType) {
  if (!token) return 1

  const pairs = token.split(",").map((part) => part.split(":"))
  const found = pairs.find(([type]) => type === mediaType)
  const parsed = Number(found?.[1] || token)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

function buildNextPageToken(results: { mediaType: MediaType; page: number; totalPages: number }[]) {
  const tokens = results
    .filter((result) => result.page < result.totalPages)
    .map((result) => `${result.mediaType}:${result.page + 1}`)

  return tokens.length > 0 ? tokens.join(",") : null
}

async function fetchDiscoverMedia<T extends MediaType>(
  mediaType: T,
  searchParams: URLSearchParams,
  limit: number,
) {
  const genresById = await getGenreMap(mediaType)
  const requestedGenre = searchParams.get("genres")
  const genreId = requestedGenre
    ? Array.from(genresById.entries()).find(([, name]) => name.toLowerCase() === requestedGenre.toLowerCase())?.[0]
    : undefined
  const shouldFilterGenre = !requestedGenre || genreId

  const page = parsePageToken(searchParams.get("pageToken"), mediaType)
  const minVotes = Math.max(Number(searchParams.get("minVoteCount") || 0), MIN_VOTES)
  const endYear = Math.min(Number(searchParams.get("endYear") || CURRENT_YEAR), CURRENT_YEAR)
  const startYear = searchParams.get("startYear")
  const sortOrder = searchParams.get("sortOrder") === "ASC" ? "asc" : "desc"
  const sortBy = sortToTmdb(searchParams.get("sortBy"), mediaType).replace(".desc", `.${sortOrder}`)
  const path = `/discover/${mediaType}`

  const data = await tmdbFetch<{
    page: number
    results?: T extends "movie" ? TmdbMovie[] : TmdbTv[]
    total_pages: number
    total_results: number
  }>(path, {
    include_adult: false,
    include_video: mediaType === "movie" ? false : undefined,
    language: "en-US",
    page,
    sort_by: sortBy,
    [dateParam(mediaType, "gte")]: startYear ? `${startYear}-01-01` : undefined,
    [dateParam(mediaType, "lte")]: `${endYear}-12-31`,
    "vote_count.gte": minVotes,
    with_genres: shouldFilterGenre ? genreId : undefined,
  })

  const titles =
    mediaType === "movie"
      ? ((data.results || []) as TmdbMovie[]).filter((movie) => !movie.video).map((movie) => normalizeMovie(movie, genresById))
      : ((data.results || []) as TmdbTv[]).map((show) => normalizeTv(show, genresById))

  return {
    mediaType,
    page: data.page,
    totalPages: data.total_pages,
    totalResults: data.total_results,
    titles: titles.slice(0, limit),
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  if (!hasTmdbCredentials()) {
    return NextResponse.json({ titles: [], nextPageToken: null, ...tmdbCredentialError() }, { status: 500 })
  }

  const mediaTypes = requestedMediaTypes(searchParams.get("types"))
  if (mediaTypes.length === 0) {
    return NextResponse.json({ titles: [], nextPageToken: null })
  }

  try {
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 25), 1), 20)
    const settled = await Promise.allSettled(mediaTypes.map((mediaType) => fetchDiscoverMedia(mediaType, searchParams, limit)))
    const results = settled
      .filter((result): result is PromiseFulfilledResult<DiscoverResult> => result.status === "fulfilled")
      .map((result) => result.value)
    const errors = settled
      .filter((result) => result.status === "rejected")
      .map((result) => (result as PromiseRejectedResult).reason)

    if (errors.length > 0) {
      console.error("TMDB discover partial failure:", errors)
    }

    const titles = results
      .flatMap((result: DiscoverResult) => result.titles)
      .sort((a, b) => (b.rating?.voteCount || 0) - (a.rating?.voteCount || 0))
      .slice(0, limit)

    return NextResponse.json({
      titles,
      nextPageToken: buildNextPageToken(results),
      totalResults: results.reduce((sum, result) => sum + result.totalResults, 0),
      ...(errors.length > 0 ? { warning: "Some discover sources failed to load" } : {}),
    })
  } catch (error) {
    console.error("TMDB discover error:", error)
    return NextResponse.json({ titles: [], nextPageToken: null, error: "Upstream error" }, { status: 500 })
  }
}
