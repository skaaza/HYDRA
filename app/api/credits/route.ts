import { NextResponse } from "next/server"
import { hasTmdbCredentials, parseHydraId, tmdbCredentialError, tmdbFetch, tmdbImage } from "@/lib/tmdb"

interface TmdbCredit {
  id: number
  name: string
  profile_path?: string | null
  known_for_department?: string
  character?: string
  job?: string
}

interface TmdbCreditsResponse {
  cast?: TmdbCredit[]
  crew?: TmdbCredit[]
}

function normalizeCredit(person: TmdbCredit, category: string) {
  const image = tmdbImage(person.profile_path, "w342")

  return {
    name: {
      id: String(person.id),
      displayName: person.name,
      ...(image ? { primaryImage: { url: image, width: 342, height: 513 } } : {}),
      primaryProfessions: person.known_for_department ? [person.known_for_department] : [],
    },
    category,
    characters: person.character ? [person.character] : person.job ? [person.job] : [],
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("imdbId") || searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "id parameter is required" }, { status: 400 })
  }

  if (!hasTmdbCredentials()) {
    return NextResponse.json({ credits: [], nextPageToken: null, total: null, ...tmdbCredentialError() }, { status: 500 })
  }

  const parsed = parseHydraId(id)
  if (!parsed) {
    return NextResponse.json({ credits: [], nextPageToken: null, total: null, error: "Unsupported title id" }, { status: 400 })
  }

  try {
    const data = await tmdbFetch<TmdbCreditsResponse>(`/${parsed.mediaType}/${parsed.tmdbId}/credits`, { language: "en-US" })
    const cast = (data.cast || []).map((person) => normalizeCredit(person, "cast"))
    const crew = (data.crew || [])
      .filter((person) => ["Director", "Writer", "Screenplay", "Creator"].includes(person.job || ""))
      .map((person) => normalizeCredit(person, "crew"))
    const credits = [...cast, ...crew]

    return NextResponse.json({
      credits,
      nextPageToken: null,
      total: credits.length,
    })
  } catch (error) {
    console.error("TMDB credits error:", error)
    return NextResponse.json(
      { credits: [], nextPageToken: null, total: null, error: "Failed to fetch credits" },
      { status: 500 },
    )
  }
}
