import { NextResponse } from "next/server"
import { hasTmdbCredentials, parseHydraId, tmdbCredentialError, tmdbFetch, tmdbImage } from "@/lib/tmdb"

const MAX_SEASONS = 20

interface TmdbTvDetails {
  seasons?: { season_number: number; episode_count: number; name?: string }[]
}

interface TmdbEpisode {
  id: number
  episode_number: number
  name?: string
  overview?: string
  runtime?: number | null
  season_number: number
  still_path?: string | null
}

interface TmdbSeason {
  episodes?: TmdbEpisode[]
}

function normalizeEpisode(ep: TmdbEpisode) {
  const image = tmdbImage(ep.still_path, "w500")

  return {
    id: String(ep.id),
    season: ep.season_number,
    episodeNumber: ep.episode_number,
    title: ep.name || `Episode ${ep.episode_number}`,
    plot: ep.overview || undefined,
    runtimeSeconds: typeof ep.runtime === "number" && ep.runtime > 0 ? ep.runtime * 60 : undefined,
    ...(image ? { primaryImage: { url: image, width: 500, height: 281 } } : {}),
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("imdbId") || searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "id parameter is required" }, { status: 400 })
  }

  if (!hasTmdbCredentials()) {
    return NextResponse.json({ episodes: [], ...tmdbCredentialError() }, { status: 500 })
  }

  const parsed = parseHydraId(id)
  if (!parsed) {
    return NextResponse.json({ episodes: [], error: "Unsupported title id" }, { status: 400 })
  }

  if (parsed.mediaType !== "tv") {
    return NextResponse.json({ episodes: [] })
  }

  try {
    const details = await tmdbFetch<TmdbTvDetails>(`/tv/${parsed.tmdbId}`, { language: "en-US" })
    const seasons = (details.seasons || [])
      .filter((season) => season.season_number > 0 && season.episode_count > 0)
      .slice(0, MAX_SEASONS)

    const seasonPayloads = await Promise.all(
      seasons.map((season) =>
        tmdbFetch<TmdbSeason>(`/tv/${parsed.tmdbId}/season/${season.season_number}`, { language: "en-US" }),
      ),
    )

    const episodes = seasonPayloads
      .flatMap((season) => season.episodes || [])
      .map(normalizeEpisode)
      .sort((a, b) => a.season - b.season || a.episodeNumber - b.episodeNumber)

    return NextResponse.json({ episodes })
  } catch (error) {
    console.error("TMDB episodes error:", error)
    return NextResponse.json({ episodes: [], error: "Failed to fetch episodes" }, { status: 500 })
  }
}
