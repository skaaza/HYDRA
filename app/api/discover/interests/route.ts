import { NextResponse } from "next/server"
import { hasTmdbCredentials, tmdbCredentialError, tmdbFetch, Genre } from "@/lib/tmdb"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  if (!hasTmdbCredentials()) {
    return NextResponse.json({ interests: [], ...tmdbCredentialError() }, { status: 500 })
  }

  try {
    const [movieData, tvData] = await Promise.all([
      tmdbFetch<{ genres?: Genre[] }>("/genre/movie/list", { language: "en-US" }),
      tmdbFetch<{ genres?: Genre[] }>("/genre/tv/list", { language: "en-US" }),
    ])
    const genres = [...(movieData.genres || []), ...(tvData.genres || [])]
    const interests = Array.from(new Map(genres.map((genre) => [genre.name, { id: genre.name, name: genre.name }])).values())

    return NextResponse.json({ interests })
  } catch (error) {
    console.error("TMDB genres error:", error)
    return NextResponse.json({ interests: [], error: "Fetch failed" }, { status: 500 })
  }
}
