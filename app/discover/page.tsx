"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Footer from "@/components/footer"
import { MovieCard } from "@/components/movie-card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SlidersHorizontal, Loader2, Search as SearchIcon } from "lucide-react"

interface Movie {
  id: string
  type: string
  primaryTitle: string
  originalTitle: string
  startYear: number
  runtimeSeconds?: number
  genres: string[]
  primaryImage?: { url: string; width: number; height: number }
  rating?: { aggregateRating: number; voteCount: number }
}

interface Interest {
  id: string
  name: string
}

const CURRENT_YEAR = new Date().getFullYear()

const COMMON_GENRES = [
  "Action","Adventure","Animation","Biography","Comedy","Crime","Documentary","Drama","Family","Fantasy",
  "History","Horror","Music","Mystery","Romance","Sci-Fi","Sport","Thriller","War","Western"
].map((g) => ({ id: g, name: g }))

function sortToApi(sort: string): { sortBy: string; sortOrder: "ASC" | "DESC" } {
  switch (sort) {
    case "POPULARITY":   return { sortBy: "SORT_BY_POPULARITY",       sortOrder: "DESC" }
    case "RELEASE_DESC": return { sortBy: "SORT_BY_RELEASE_DATE",     sortOrder: "DESC" }
    case "RELEASE_ASC":  return { sortBy: "SORT_BY_RELEASE_DATE",     sortOrder: "ASC" }
    case "RATING_DESC":  return { sortBy: "SORT_BY_USER_RATING",      sortOrder: "DESC" }
    case "RATING_ASC":   return { sortBy: "SORT_BY_USER_RATING",      sortOrder: "ASC" }
    case "COUNT_DESC":   return { sortBy: "SORT_BY_USER_RATING_COUNT",sortOrder: "DESC" }
    case "COUNT_ASC":    return { sortBy: "SORT_BY_USER_RATING_COUNT",sortOrder: "ASC" }
    case "YEAR_DESC":    return { sortBy: "SORT_BY_YEAR",             sortOrder: "DESC" }
    case "YEAR_ASC":     return { sortBy: "SORT_BY_YEAR",             sortOrder: "ASC" }
    default:             return { sortBy: "SORT_BY_RELEASE_DATE",     sortOrder: "DESC" }
  }
}

export default function DiscoverPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const searchParamsString = searchParams.toString()

  const [titles, setTitles] = useState<Movie[]>([])
  const [loading, setLoading] = useState(false)
  const [nextPageToken, setNextPageToken] = useState<string | null>(null)

  // Filters (z URL)
  const [inputValue, setInputValue] = useState("")          // Debounced Input
  const [query, setQuery] = useState("")                    // q
  const [minYear, setMinYear] = useState<number>(1980)      // minYear
  const [maxYear, setMaxYear] = useState<number>(CURRENT_YEAR) // maxYear
  const [minRating, setMinRating] = useState<number>(0)     // minRating
  const [type, setType] = useState<string>("ALL")           // type
  const [genre, setGenre] = useState<string>("ALL")         // genre
  const [sort, setSort] = useState<string>("RELEASE_DESC")  // sort

  // Genres (via proxy)
  const [interests, setInterests] = useState<Interest[]>([])

  // 1) Inicjalizacja stanu z URL (jednorazowo)
  useEffect(() => {
    const q = searchParams.get("q") ?? ""
    const genreParam = searchParams.get("genre") ?? searchParams.get("genres") ?? "ALL"
    setInputValue(q)
    setQuery(q)
    setSort(searchParams.get("sort") ?? "RELEASE_DESC")
    setType(searchParams.get("type") ?? "ALL")
    setGenre(genreParam)
    setMinYear(searchParams.get("minYear") ? Number(searchParams.get("minYear")) : 1980)
    setMaxYear(searchParams.get("maxYear") ? Math.min(Number(searchParams.get("maxYear")), CURRENT_YEAR) : CURRENT_YEAR)
    setMinRating(searchParams.get("minRating") ? Number(searchParams.get("minRating")) : 0)
    // Usunięto błąd eslint, pusta tablica zależności jest tu celowa na start komponentu
  }, [searchParamsString]) 

  // Debounce dla wyszukiwarki (optymalizacja API)
  useEffect(() => {
    const timeoutId = setTimeout(() => setQuery(inputValue), 500)
    return () => clearTimeout(timeoutId)
  }, [inputValue])

  // 2) Sync stanu → URL
  useEffect(() => {
    const params = new URLSearchParams(Array.from(searchParams.entries()))
    
    if (query) params.set("q", query); else params.delete("q")
    if (sort !== "RELEASE_DESC") params.set("sort", sort); else params.delete("sort")
    if (type !== "ALL") params.set("type", type); else params.delete("type")
    if (genre !== "ALL") params.set("genre", genre); else params.delete("genre")
    params.delete("genres")
    if (minYear !== 1980) params.set("minYear", String(minYear)); else params.delete("minYear")
    if (maxYear !== CURRENT_YEAR) params.set("maxYear", String(maxYear)); else params.delete("maxYear")
    if (minRating !== 0) params.set("minRating", String(minRating)); else params.delete("minRating")
    
    const qs = params.toString()
    router.replace(qs ? `/discover?${qs}` : "/discover", { scroll: false })
  }, [query, sort, type, genre, minYear, maxYear, minRating, router, searchParamsString])

  // 3) Pobierz listę gatunków
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch("/api/discover/interests", { cache: "no-store" })
        const ct = res.headers.get("content-type") || ""
        if (!ct.includes("application/json")) {
          if (active) setInterests(COMMON_GENRES)
          return
        }
        const data = await res.json().catch(() => null)
        const list: Interest[] = Array.isArray(data?.interests) ? data.interests : []
        if (active) setInterests(list.length > 0 ? list : COMMON_GENRES)
      } catch {
        if (active) setInterests(COMMON_GENRES)
      }
    })()
    return () => { active = false }
  }, [])

  const buildDiscoverUrl = useCallback((pageToken?: string | null) => {
    const params = new URLSearchParams()
    const { sortBy, sortOrder } = sortToApi(sort)

    params.set("limit", "25")
    params.set("sortBy", sortBy)
    params.set("sortOrder", sortOrder)
    params.set("minVoteCount", "1")
    params.set("endYear", String(maxYear))
    if (minYear) params.set("startYear", String(minYear))
    if (type && type !== "ALL") params.append("types", type)
    if (genre && genre !== "ALL") params.append("genres", genre)
    if (pageToken) params.set("pageToken", pageToken)

    return `/api/discover/titles?${params.toString()}`
  }, [sort, minYear, maxYear, type, genre])

  const fetchPage = useCallback(async (append = false, token: string | null = null) => {
    setLoading(true)
    try {
      let data: { titles: Movie[]; nextPageToken: string | null } = { titles: [], nextPageToken: null }

      if (query.trim().length >= 2) {
        const res = await fetch(`/api/search?query=${encodeURIComponent(query)}`, { cache: "no-store" })
        const ct = res.headers.get("content-type") || ""
        const json = ct.includes("application/json") ? await res.json().catch(() => ({})) : {}
        data.titles = Array.isArray(json?.titles) ? json.titles : []
        data.nextPageToken = null
      } else {
        const res = await fetch(buildDiscoverUrl(token), { cache: "no-store" })
        const ct = res.headers.get("content-type") || ""
        const json = ct.includes("application/json") ? await res.json().catch(() => ({})) : {}
        data.titles = Array.isArray(json?.titles) ? json.titles : []
        data.nextPageToken = json?.nextPageToken ?? null
      }

      let filtered = data.titles.filter((m) => {
        const yearOk = !m.startYear || (m.startYear >= minYear && m.startYear <= maxYear)
        const ratingOk = m.rating && typeof m.rating.aggregateRating === "number" && m.rating.aggregateRating >= minRating
        const votesOk = m.rating && typeof m.rating.voteCount === "number" && m.rating.voteCount > 0
        const hasPoster = !!m.primaryImage?.url
        const typeOk = type === "ALL" ? true : mapTypeToApi(type) === normalizeType(m.type)
        const genreOk = genre === "ALL" ? true : (m.genres || []).includes(genre)
        return yearOk && ratingOk && votesOk && hasPoster && typeOk && genreOk
      })

      if (query.trim()) filtered = sortClient(filtered, sort)

      setTitles((prev) => (append ? [...prev, ...filtered] : filtered))
      setNextPageToken(query.trim() ? null : data.nextPageToken)
    } catch (e) {
      console.error("Discover fetch error:", e)
      if (!append) {
        setTitles([])
        setNextPageToken(null)
      }
    } finally {
      setLoading(false)
    }
  }, [query, buildDiscoverUrl, minYear, maxYear, minRating, type, genre, sort])

  useEffect(() => {
    fetchPage(false, null)
  }, [fetchPage])

  const loadMore = () => {
    if (loading || !nextPageToken) return
    fetchPage(true, nextPageToken)
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
          {/* Left: content */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-semibold tracking-tight">Discover</h1>
              <div className="hidden lg:flex items-center gap-2 text-muted-foreground">
                <SlidersHorizontal className="h-4 w-4" />
                <span className="text-sm">Filters</span>
              </div>
            </div>

            {loading && titles.length === 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="aspect-[2/3] rounded-xl bg-muted animate-pulse" />
                ))}
              </div>
            ) : titles.length === 0 ? (
              <p className="text-muted-foreground text-sm">No titles found with current filters.</p>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {titles.map((movie) => (
                    <MovieCard
                      key={movie.id}
                      movie={movie}
                      onSelect={() => {
                        const params = new URLSearchParams(window.location.search)
                        params.set("title", movie.id)
                        params.delete("s")
                        params.delete("e")
                        // SPA Navigation zamiast twardego przeładowania
                        router.push(`/?${params.toString()}`)
                      }}
                      isSelected={false}
                    />
                  ))}
                </div>

                {nextPageToken && !query.trim() && (
                  <div className="text-center mt-8">
                    <Button variant="outline" disabled={loading} onClick={loadMore}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load more"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </section>

          {/* Right: sidebar */}
          <aside className="lg:sticky lg:top-8 h-fit">
            <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-4 space-y-4">
              <h2 className="text-lg font-semibold">Filters</h2>

              {/* 🔎 Search */}
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Search titles…"
                  className="pl-9"
                />
                {inputValue && (
                  <button
                    type="button"
                    onClick={() => { setInputValue(""); setQuery(""); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </button>
                )}
                <p className="text-[11px] text-muted-foreground mt-1">
                  Search uses full-text and ignores titles without ratings.
                </p>
              </div>

              {/* Sort */}
              <div>
                <label className="text-xs text-muted-foreground">Sort by</label>
                <Select value={sort} onValueChange={setSort}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="POPULARITY">Popularity</SelectItem>
                    <SelectItem value="RELEASE_DESC">Release date — Newest</SelectItem>
                    <SelectItem value="RELEASE_ASC">Release date — Oldest</SelectItem>
                    <SelectItem value="RATING_DESC">User rating — High to Low</SelectItem>
                    <SelectItem value="RATING_ASC">User rating — Low to High</SelectItem>
                    <SelectItem value="COUNT_DESC">Rating count — High to Low</SelectItem>
                    <SelectItem value="COUNT_ASC">Rating count — Low to High</SelectItem>
                    <SelectItem value="YEAR_DESC">Year — Newest</SelectItem>
                    <SelectItem value="YEAR_ASC">Year — Oldest</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Years */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Min year</label>
                  <Input
                    type="number"
                    value={minYear}
                    onChange={(e) => {
                      const v = Math.min(Number(e.target.value) || 0, CURRENT_YEAR)
                      setMinYear(v)
                      if (v > maxYear) setMaxYear(v)
                    }}
                    min={1900}
                    max={CURRENT_YEAR}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Max year</label>
                  <Input
                    type="number"
                    value={maxYear}
                    onChange={(e) => {
                      const v = Math.min(Number(e.target.value) || 0, CURRENT_YEAR)
                      setMaxYear(v)
                      if (minYear > v) setMinYear(v)
                    }}
                    min={1900}
                    max={CURRENT_YEAR}
                  />
                </div>
              </div>

              {/* Min rating */}
              <div>
                <label className="text-xs text-muted-foreground">Min rating</label>
                <Input
                  type="number"
                  step="0.1"
                  min={0}
                  max={10}
                  value={minRating}
                  onChange={(e) => setMinRating(Math.max(0, Math.min(10, Number(e.target.value) || 0)))}
                />
              </div>

              {/* Type */}
              <div>
                <label className="text-xs text-muted-foreground">Type</label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All types</SelectItem>
                    <SelectItem value="MOVIE">Movie</SelectItem>
                    <SelectItem value="TV_SERIES">TV Series</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Genre */}
              <div>
                <label className="text-xs text-muted-foreground">Genre</label>
                <Select value={genre} onValueChange={setGenre}>
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All</SelectItem>
                    {interests.map((it) => (
                      <SelectItem key={it.id} value={it.name}>
                        {it.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="secondary"
                onClick={() => fetchPage(false, null)}
                disabled={loading}
                className="w-full"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply filters"}
              </Button>
            </div>
          </aside>
        </div>
      </div>
      <Footer/>
    </main>
  )
}

/* helpers */
function sortClient(list: Movie[], mode: string): Movie[] {
  const copy = [...list]
  switch (mode) {
    case "POPULARITY":
      copy.sort((a, b) => (b.rating?.voteCount ?? 0) - (a.rating?.voteCount ?? 0)); break
    case "RELEASE_DESC":
      copy.sort((a, b) => (b.startYear ?? 0) - (a.startYear ?? 0)); break
    case "RELEASE_ASC":
      copy.sort((a, b) => (a.startYear ?? 0) - (b.startYear ?? 0)); break
    case "RATING_DESC":
      copy.sort((a, b) => (b.rating?.aggregateRating ?? 0) - (a.rating?.aggregateRating ?? 0)); break
    case "RATING_ASC":
      copy.sort((a, b) => (a.rating?.aggregateRating ?? 0) - (b.rating?.aggregateRating ?? 0)); break
    case "COUNT_DESC":
      copy.sort((a, b) => (b.rating?.voteCount ?? 0) - (a.rating?.voteCount ?? 0)); break
    case "COUNT_ASC":
      copy.sort((a, b) => (a.rating?.voteCount ?? 0) - (b.rating?.voteCount ?? 0)); break
    case "YEAR_DESC":
      copy.sort((a, b) => (b.startYear ?? 0) - (a.startYear ?? 0)); break
    case "YEAR_ASC":
      copy.sort((a, b) => (a.startYear ?? 0) - (b.startYear ?? 0)); break
  }
  return copy
}

function normalizeType(t?: string) {
  if (!t) return ""
  const u = t.toUpperCase()
  if (u === "TVSERIES" || u === "TV_SERIES") return "TV_SERIES"
  if (u === "TVMINISERIES" || u === "TV_MINI_SERIES") return "TV_MINI_SERIES"
  if (u === "TVSPECIAL" || u === "TV_SPECIAL") return "TV_SPECIAL"
  if (u === "TVMOVIE" || u === "TV_MOVIE") return "TV_MOVIE"
  return u
}

function mapTypeToApi(t: string) {
  return normalizeType(t)
}
