const TMDB_BASE_URL = "https://api.themoviedb.org/3"
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p"

export type HydraTitleType = "MOVIE" | "TV_SERIES"

export interface HydraMovie {
  id: string
  type: HydraTitleType
  primaryTitle: string
  originalTitle: string
  startYear: number
  runtimeSeconds?: number
  genres: string[]
  primaryImage?: { url: string; width: number; height: number }
  backdropImage?: { url: string; width: number; height: number }
  rating?: { aggregateRating: number; voteCount: number }
  plot?: string
  imdbId?: string | null
}

export interface TmdbMovie {
  id: number
  adult?: boolean
  backdrop_path?: string | null
  genre_ids?: number[]
  genres?: { id: number; name: string }[]
  imdb_id?: string | null
  original_language?: string
  original_title?: string
  overview?: string
  popularity?: number
  poster_path?: string | null
  release_date?: string
  runtime?: number | null
  title?: string
  video?: boolean
  vote_average?: number
  vote_count?: number
}

export interface TmdbTv {
  id: number
  backdrop_path?: string | null
  episode_run_time?: number[]
  first_air_date?: string
  genre_ids?: number[]
  genres?: { id: number; name: string }[]
  name?: string
  original_name?: string
  overview?: string
  poster_path?: string | null
  vote_average?: number
  vote_count?: number
}

export interface Genre {
  id: number
  name: string
}

export type MediaType = "movie" | "tv"

function getBearerToken() {
  return process.env.TMDB_BEARER_TOKEN || process.env.TMDB_READ_ACCESS_TOKEN || ""
}

function getApiKey() {
  return process.env.TMDB_API_KEY || ""
}

export function hasTmdbCredentials() {
  return Boolean(getBearerToken() || getApiKey())
}

export function tmdbCredentialError() {
  return {
    error: "TMDB credentials are not configured",
    message: "Set TMDB_BEARER_TOKEN or TMDB_READ_ACCESS_TOKEN in your environment.",
  }
}

export async function tmdbFetch<T>(path: string, params?: Record<string, string | number | boolean | undefined | null>) {
  if (!hasTmdbCredentials()) {
    throw new Error("Missing TMDB credentials")
  }

  const url = new URL(`${TMDB_BASE_URL}${path}`)
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value))
    }
  }

  const bearerToken = getBearerToken()
  if (!bearerToken) {
    url.searchParams.set("api_key", getApiKey())
  }

  const response = await fetch(url.toString(), {
    cache: "no-store",
    headers: {
      accept: "application/json",
      ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
    },
  })

  const contentType = response.headers.get("content-type") || ""
  const body = contentType.includes("application/json") ? await response.json().catch(() => null) : await response.text()

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "status_message" in body
        ? String((body as { status_message?: string }).status_message)
        : `TMDB responded with status ${response.status}`
    throw new Error(message)
  }

  return body as T
}

export function tmdbImage(path?: string | null, size = "w500") {
  return path ? `${TMDB_IMAGE_BASE_URL}/${size}${path}` : undefined
}

export function yearFromDate(date?: string | null) {
  if (!date) return 0
  const year = Number(date.slice(0, 4))
  return Number.isFinite(year) ? year : 0
}

export function normalizeMovie(movie: TmdbMovie, genresById = new Map<number, string>()): HydraMovie {
  const poster = tmdbImage(movie.poster_path, "w500")
  const backdrop = tmdbImage(movie.backdrop_path, "w780")
  const genres = movie.genres?.map((genre) => genre.name) || movie.genre_ids?.map((id) => genresById.get(id)).filter(Boolean) || []

  return {
    id: `tmdb-movie-${movie.id}`,
    type: "MOVIE",
    primaryTitle: movie.title || movie.original_title || "Untitled movie",
    originalTitle: movie.original_title || movie.title || "Untitled movie",
    startYear: yearFromDate(movie.release_date),
    runtimeSeconds: typeof movie.runtime === "number" && movie.runtime > 0 ? movie.runtime * 60 : undefined,
    genres,
    ...(poster ? { primaryImage: { url: poster, width: 500, height: 750 } } : {}),
    ...(backdrop ? { backdropImage: { url: backdrop, width: 780, height: 439 } } : {}),
    rating:
      typeof movie.vote_average === "number" && typeof movie.vote_count === "number"
        ? { aggregateRating: movie.vote_average, voteCount: movie.vote_count }
        : undefined,
    plot: movie.overview || undefined,
    imdbId: movie.imdb_id ?? null,
  }
}

export function normalizeTv(show: TmdbTv, genresById = new Map<number, string>()): HydraMovie {
  const poster = tmdbImage(show.poster_path, "w500")
  const backdrop = tmdbImage(show.backdrop_path, "w780")
  const genres = show.genres?.map((genre) => genre.name) || show.genre_ids?.map((id) => genresById.get(id)).filter(Boolean) || []
  const runtime = show.episode_run_time?.find((value) => value > 0)

  return {
    id: `tmdb-tv-${show.id}`,
    type: "TV_SERIES",
    primaryTitle: show.name || show.original_name || "Untitled series",
    originalTitle: show.original_name || show.name || "Untitled series",
    startYear: yearFromDate(show.first_air_date),
    runtimeSeconds: runtime ? runtime * 60 : undefined,
    genres,
    ...(poster ? { primaryImage: { url: poster, width: 500, height: 750 } } : {}),
    ...(backdrop ? { backdropImage: { url: backdrop, width: 780, height: 439 } } : {}),
    rating:
      typeof show.vote_average === "number" && typeof show.vote_count === "number"
        ? { aggregateRating: show.vote_average, voteCount: show.vote_count }
        : undefined,
    plot: show.overview || undefined,
  }
}

export function parseHydraId(id: string): { mediaType: MediaType; tmdbId: string } | null {
  const moviePrefix = "tmdb-movie-"
  const tvPrefix = "tmdb-tv-"

  if (id.startsWith(moviePrefix)) {
    return { mediaType: "movie", tmdbId: id.slice(moviePrefix.length) }
  }
  if (id.startsWith(tvPrefix)) {
    return { mediaType: "tv", tmdbId: id.slice(tvPrefix.length) }
  }
  if (/^\d+$/.test(id)) {
    return { mediaType: "movie", tmdbId: id }
  }
  return null
}

export async function getGenreMap(mediaType: MediaType = "movie") {
  const data = await tmdbFetch<{ genres?: Genre[] }>(`/genre/${mediaType}/list`, { language: "en-US" })
  return new Map((data.genres || []).map((genre) => [genre.id, genre.name]))
}

export function sortToTmdb(sortBy?: string | null, mediaType: MediaType = "movie") {
  const dateField = mediaType === "tv" ? "first_air_date" : "primary_release_date"

  switch (sortBy) {
    case "SORT_BY_USER_RATING":
      return "vote_average.desc"
    case "SORT_BY_USER_RATING_COUNT":
      return "vote_count.desc"
    case "SORT_BY_POPULARITY":
      return "popularity.desc"
    case "SORT_BY_YEAR":
    case "SORT_BY_RELEASE_DATE":
    default:
      return `${dateField}.desc`
  }
}

export function dateParam(mediaType: MediaType, bound: "gte" | "lte") {
  const field = mediaType === "tv" ? "first_air_date" : "primary_release_date"
  return `${field}.${bound}`
}
