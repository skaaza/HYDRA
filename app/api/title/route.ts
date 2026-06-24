import { NextResponse } from "next/server"
import {
  hasTmdbCredentials,
  normalizeMovie,
  normalizeTv,
  parseHydraId,
  tmdbCredentialError,
  tmdbFetch,
  TmdbMovie,
  TmdbTv,
} from "@/lib/tmdb"

interface TmdbMovieDetails extends TmdbMovie {
  external_ids?: {
    imdb_id?: string | null
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 })
  }

  if (!hasTmdbCredentials()) {
    return NextResponse.json({ title: null, ...tmdbCredentialError() }, { status: 500 })
  }

  const parsed = parseHydraId(id)
  if (!parsed) {
    return NextResponse.json({ title: null, error: "Unsupported title id" }, { status: 400 })
  }

  try {
    if (parsed.mediaType === "tv") {
      const show = await tmdbFetch<TmdbTv>(`/tv/${parsed.tmdbId}`, { language: "en-US" })
      return NextResponse.json({ title: normalizeTv(show) })
    }

    const movie = await tmdbFetch<TmdbMovieDetails>(`/movie/${parsed.tmdbId}`, {
      language: "en-US",
      append_to_response: "external_ids",
    })

    return NextResponse.json({ title: normalizeMovie({ ...movie, imdb_id: movie.external_ids?.imdb_id }) })
  } catch (error) {
    console.error("TMDB title error:", error)
    return NextResponse.json({ title: null, error: "Unable to resolve title by id" }, { status: 502 })
  }
}
