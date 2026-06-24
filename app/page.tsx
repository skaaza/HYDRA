"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, Loader2, SlidersHorizontal } from "lucide-react"
import Footer from "@/components/footer"
import { useDebounce } from "use-debounce"
import { Input } from "../components/ui/input"
import { Button } from "../components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { MovieCard } from "../components/movie-card"
import { VideoPlayer } from "../components/video-player"
import AnimatedLogo from "../components/logo"
import Link from "next/link"
import Image from "next/image"

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

interface Episode {
  id: string
  season: number
  episodeNumber: number
  title: string
  primaryImage?: { url: string; width: number; height: number }
  runtimeSeconds?: number
  plot?: string
  rating?: { aggregateRating: number; voteCount: number }
}


const CURRENT_YEAR = new Date().getFullYear()
const MIN_VOTES = 100

function isSeriesType(type?: string) {
  const normalized = (type || "").toUpperCase()
  return normalized === "TVSERIES" || normalized === "TV_SERIES"
}

function normalizeEpisode(ep: any): Episode {
  const seasonValue = ep?.season ?? ep?.seasonNumber ?? ep?.SeasonNumber ?? 1
  const episodeValue = ep?.episodeNumber ?? ep?.episode ?? ep?.EpisodeNumber ?? 1
  const season = typeof seasonValue === "string" ? parseInt(seasonValue, 10) : Number(seasonValue)
  const episodeNumber = typeof episodeValue === "string" ? parseInt(episodeValue, 10) : Number(episodeValue)

  return {
    ...ep,
    season: Number.isFinite(season) && season > 0 ? season : 1,
    episodeNumber: Number.isFinite(episodeNumber) && episodeNumber > 0 ? episodeNumber : 1,
    title: ep?.title ?? ep?.primaryTitle ?? "Episode",
  }
}

export default function Home() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedQuery] = useDebounce(searchQuery, 500)
  const [suggestions, setSuggestions] = useState<Movie[]>([])
  const [searchResults, setSearchResults] = useState<Movie[]>([])
  const [filteredResults, setFilteredResults] = useState<Movie[]>([])
  const [visibleCount, setVisibleCount] = useState(10)
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null)
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [selectedEpisode, setSelectedEpisode] = useState<{ season: number; episode: number } | null>(null)
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false)

  const [similarTitles, setSimilarTitles] = useState<Movie[]>([])
  const [isLoadingSimilar, setIsLoadingSimilar] = useState(false)

  const [sortOption, setSortOption] = useState("newest")
  const [minYear, setMinYear] = useState(1900)
  const [minRating, setMinRating] = useState(0)

  const [latest, setLatest] = useState<Movie[]>([])
  const [rated, setRated] = useState<Movie[]>([])
  const [watched, setWatched] = useState<Movie[]>([])
  const [loadingSections, setLoadingSections] = useState(true)

  const cache = useRef<Record<string, Movie[]>>({})
  const currentYear = new Date().getFullYear()

  // Strict filter for main grids/search results — requires image + vote threshold
  const allowTitle = (m: Movie) =>
    !!m.primaryImage?.url &&
    !!m.rating?.voteCount &&
    m.rating.voteCount >= MIN_VOTES &&
    (!m.startYear || m.startYear <= CURRENT_YEAR)


  const allowSimilar = (m: Movie) => 
    !!m.primaryImage?.url &&
    !!m.rating?.aggregateRating && m.rating.aggregateRating >= 6.0 &&
    !!m.rating?.voteCount && m.rating.voteCount >= 500

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        setLoadingSections(true)
        const r = await fetch("/api/home/sections", { cache: "no-store" })
        if (!r.ok) {
          throw new Error(`Home sections fetch failed: ${r.status}`)
        }
        const data = await r.json()
        const latestRaw = Array.isArray(data?.latest) ? data.latest.filter(allowTitle) : []
        const ratedRaw = Array.isArray(data?.rated) ? data.rated.filter(allowTitle) : []
        const watchedRaw = Array.isArray(data?.watched) ? data.watched.filter(allowTitle) : []

        if (!active) return
        setLatest(latestRaw)
        setRated(ratedRaw)
        setWatched(watchedRaw)
      } catch (error) {
        console.error("Error fetching home sections:", error)
        if (active) {
          setLatest([])
          setRated([])
          setWatched([])
        }
      } finally {
        if (active) setLoadingSections(false)
      }
    })()
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!selectedMovie) {
      setSimilarTitles([])
      return
    }

    let active = true
const fetchSimilar = async () => {
      setIsLoadingSimilar(true)
      try {
        const genre = selectedMovie.genres?.[0]

        // FIX: Ask the API for highest rated titles directly instead of popularity.
        // We enforce the 1000 vote minimum here so the API does the heavy lifting.
        const params = new URLSearchParams({
          limit: "30",
          sortBy: "SORT_BY_USER_RATING", // Sort by top scores, not popularity
          sortOrder: "DESC",
          minVoteCount: "1000",           // Let the server filter out the low-vote junk
          types: isSeriesType(selectedMovie.type) ? "TV_SERIES" : "MOVIE",
        })
        if (genre) params.append("genres", genre)

        const r = await fetch(`/api/discover/titles?${params.toString()}`, { cache: "no-store" })
        if (!r.ok) throw new Error(`Similar titles fetch failed: ${r.status}`)
        const data = await r.json()
        const titles = Array.isArray(data?.titles) ? data.titles : []

        if (active) {
          setSimilarTitles(
            titles
              .filter(allowSimilar)
              .filter((t: Movie) => t.id !== selectedMovie.id)
              .slice(0, 8) 
          )
        }
      } catch (err) {
        console.error("Error fetching similar titles:", err)
        if (active) setSimilarTitles([])
      } finally {
        if (active) setIsLoadingSimilar(false)
      }
    }
    fetchSimilar()

    return () => { active = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMovie?.id])

  useEffect(() => {
    const fetchEpisodes = async () => {
      if (!selectedMovie || !isSeriesType(selectedMovie.type)) {
        setEpisodes([])
        setSelectedEpisode(null)
        return
      }
      setIsLoadingEpisodes(true)
      try {
        const response = await fetch(`/api/episodes?id=${encodeURIComponent(selectedMovie.id)}`)
        if (!response.ok) throw new Error(`Episodes fetch failed: ${response.status}`)
        const data = await response.json()
        const transformed = Array.isArray(data.episodes) ? data.episodes.map(normalizeEpisode) : []
        setEpisodes(transformed)
        if (transformed.length > 0) {
          setSelectedEpisode((prev) =>
            prev && Number.isFinite(prev.season) && Number.isFinite(prev.episode)
              ? prev
              : { season: transformed[0].season, episode: transformed[0].episodeNumber }
          )
        }
      } catch (error) {
        setEpisodes([])
      } finally {
        setIsLoadingEpisodes(false)
      }
    }
    fetchEpisodes()
  }, [selectedMovie])

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!debouncedQuery.trim()) return setSuggestions([])
      if (cache.current[debouncedQuery]) return setSuggestions(cache.current[debouncedQuery])
      try {
        const res = await fetch(`/api/search?query=${encodeURIComponent(debouncedQuery)}`)
        const data = await res.json()
        const filtered = (data.titles || []).filter((m: Movie) => m.startYear <= currentYear).filter(allowTitle)
        cache.current[debouncedQuery] = filtered
        setSuggestions(filtered)
      } catch (err) {}
    }
    fetchSuggestions()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery])

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!searchQuery.trim()) return
    setIsLoading(true)
    setSelectedMovie(null)
    setShowSuggestions(false)
    try {
      const res = await fetch(`/api/search?query=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()
      const filtered = (data.titles || []).filter((m: Movie) => m.startYear <= currentYear).filter(allowTitle)
      setSearchResults(filtered)
      setVisibleCount(10)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let list = [...searchResults]
    list = list.filter((m) => (!m.startYear || m.startYear >= minYear) && (!m.rating?.aggregateRating || m.rating.aggregateRating >= minRating))
    switch (sortOption) {
      case "newest": list.sort((a, b) => (b.startYear || 0) - (a.startYear || 0)); break
      case "oldest": list.sort((a, b) => (a.startYear || 0) - (b.startYear || 0)); break
      case "rating-high": list.sort((a, b) => (b.rating?.aggregateRating || 0) - (a.rating?.aggregateRating || 0)); break
      case "rating-low": list.sort((a, b) => (a.rating?.aggregateRating || 0) - (b.rating?.aggregateRating || 0)); break
    }
    setFilteredResults(list)
  }, [searchResults, sortOption, minYear, minRating])

  const syncUrl = (movie: Movie | null, ep?: { season: number; episode: number } | null, method: "push" | "replace" = "replace") => {
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "")
    if (movie?.id) params.set("title", movie.id)
    else params.delete("title")
    if (isSeriesType(movie?.type) && ep?.season && ep?.episode) {
      params.set("s", String(ep.season)); params.set("e", String(ep.episode))
    } else {
      params.delete("s"); params.delete("e")
    }
    const qs = params.toString()
    ;(method === "push" ? router.push : router.replace)(qs ? `/?${qs}` : "/", { scroll: false })
  }

  const handleMovieSelect = (movie: Movie) => {
    setSelectedMovie(movie)
    setSelectedEpisode(null)
    setShowSuggestions(false)
    setSuggestions([])
    syncUrl(movie, null, "push")
    setTimeout(() => document.getElementById("video-player")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50)
  }

  const handleLogoClick = () => {
    setSelectedMovie(null)
    setSelectedEpisode(null)
    setSearchResults([])
    setSuggestions([])
    setSearchQuery("")
    syncUrl(null, null, "push")
  }

  const handleEpisodeSelect = (season: number, episode: number) => {
    const next = { season, episode }
    setSelectedEpisode(next)
    syncUrl(selectedMovie, next, "replace")
    setTimeout(() => document.getElementById("video-player")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100)
  }

  useEffect(() => {
    const id = searchParams.get("title")
    const s = parseInt(searchParams.get("s") || "", 10)
    const e = parseInt(searchParams.get("e") || "", 10)

    if (!id) {
      if (selectedMovie) { setSelectedMovie(null); setSelectedEpisode(null) }
      return
    }

    if (selectedMovie?.id === id) {
      if (isSeriesType(selectedMovie.type) && Number.isFinite(s) && Number.isFinite(e)) {
        setSelectedEpisode({ season: s, episode: e })
      }
      return
    }

    ;(async () => {
      try {
        setIsLoading(true)
        const res = await fetch(`/api/title?id=${encodeURIComponent(id)}`)
        if (!res.ok) throw new Error(`Title fetch failed: ${res.status}`)
        const data = await res.json()
        const found = data?.title as Movie | undefined
        if (found && allowTitle(found)) {
          setSelectedMovie(found)
          if (isSeriesType(found.type) && Number.isFinite(s) && Number.isFinite(e)) setSelectedEpisode({ season: s, episode: e })
          else setSelectedEpisode(null)
          setTimeout(() => document.getElementById("video-player")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50)
        }
      } finally { setIsLoading(false) }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams?.toString()])

  const Section = ({ title, moreHref, items }: { title: string; moreHref: string; items: Movie[] }) => (
    <section className="mt-16">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl md:text-2xl font-semibold tracking-tight">{title}</h2>
        <Link href={moreHref}>
          <Button variant="ghost" className="text-muted-foreground hover:text-foreground">View all</Button>
        </Link>
      </div>

      {loadingSections && items.length === 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="aspect-[2/3] rounded-xl bg-card border border-border animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-sm">No titles found.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {items.slice(0, 10).map((movie) => <MovieCard key={movie.id} movie={movie} onSelect={handleMovieSelect} isSelected={false} />)}
        </div>
      )}
    </section>
  )

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <main className="container max-w-7xl mx-auto px-4 py-12 flex-1">
        
        <header className="flex flex-col items-center mb-12">
          <div className="cursor-pointer transition-opacity hover:opacity-90" onClick={handleLogoClick}>
            <AnimatedLogo width={320} />
          </div>
          <p className="text-muted-foreground text-sm sm:text-base mt-4 font-medium tracking-wide">
            Get good get HYDRA
          </p>
        </header>

        <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-10 relative">
          <div className="flex gap-3">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                type="text"
                placeholder="Search movies, shows, or actors..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true) }}
                onFocus={() => setShowSuggestions(true)}
                className="pl-12 h-14 text-base bg-card/50 border-border/60 hover:border-border focus:bg-card rounded-2xl shadow-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(""); setSuggestions([]); setShowSuggestions(false) }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >✕</button>
              )}
            </div>
            <Button type="submit" size="lg" className="h-14 px-8 rounded-2xl shadow-sm" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "Search"}
            </Button>
          </div>

          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-50 bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-2xl mt-3 w-full max-h-72 overflow-y-auto overflow-x-hidden">
              {suggestions.slice(0, 6).map((movie) => (
                <li
                  key={movie.id}
                  onClick={() => handleMovieSelect(movie)}
                  className="px-5 py-3 hover:bg-muted/50 cursor-pointer flex justify-between items-center transition-colors"
                >
                  <span className="font-medium text-sm">
                    {movie.primaryTitle} <span className="text-xs text-muted-foreground font-normal ml-1">({movie.startYear})</span>
                  </span>
                  {movie.rating && <span className="text-xs font-medium text-muted-foreground flex items-center gap-1"><span className="text-yellow-500">★</span> {movie.rating.aggregateRating.toFixed(1)}</span>}
                </li>
              ))}
            </ul>
          )}
        </form>

        <div className="max-w-2xl mx-auto mb-12">
          <Link href="https://ublockorigin.com/" target="_blank" rel="noopener noreferrer">
            <div className="group flex items-center gap-5 rounded-2xl border border-red-900/30 bg-red-950/10 p-4 transition-colors hover:bg-red-950/20">
              <div className="shrink-0 bg-background rounded-xl p-2 border border-border shadow-sm">
                <Image src="/UBlock_Origin.svg" alt="uBlock Origin" width={32} height={32} className="w-8 h-8" priority={false} />
              </div>
              <div className="flex-1">
                <h3 className="text-foreground text-sm font-medium">
                  Enhance your experience with <span className="text-red-500 font-semibold group-hover:text-red-400 transition-colors">uBlock Origin</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Block intrusive ads for cleaner, faster streaming.</p>
              </div>
            </div>
          </Link>
        </div>

        {selectedMovie && (
          <div id="video-player" className="mb-16 scroll-mt-6">
            <VideoPlayer
              movie={selectedMovie}
              episodes={episodes}
              selectedEpisode={selectedEpisode}
              onEpisodeSelect={handleEpisodeSelect}
              isLoadingEpisodes={isLoadingEpisodes}
              similarTitles={similarTitles}
              onSimilarSelect={handleMovieSelect}
            />
          </div>
        )}

        {!selectedMovie && filteredResults.length > 0 && (
          <div className="mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
              <h2 className="text-2xl font-semibold tracking-tight">Search Results</h2>
              <div className="flex flex-wrap gap-3 items-center bg-card/50 p-2 rounded-xl border border-border/60">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground ml-2" />
                <Select onValueChange={setSortOption} defaultValue="newest">
                  <SelectTrigger className="w-[140px] h-9 text-xs border-0 bg-transparent focus:ring-0">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="oldest">Oldest</SelectItem>
                    <SelectItem value="rating-high">Highest Rating</SelectItem>
                    <SelectItem value="rating-low">Lowest Rating</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {filteredResults.slice(0, visibleCount).map((movie) => (
                <MovieCard key={movie.id} movie={movie} onSelect={handleMovieSelect} isSelected={false} />
              ))}
            </div>

            {visibleCount < filteredResults.length && (
              <div className="text-center mt-10">
                <Button variant="outline" className="rounded-full px-8" onClick={() => setVisibleCount((p) => p + 10)}>
                  Load More
                </Button>
              </div>
            )}
          </div>
        )}

        {!selectedMovie && filteredResults.length === 0 && (
          <div className="space-y-4">
            <Section title="Latest Releases" moreHref="/discover?sort=RELEASE_DESC" items={latest} />
            <Section title="Highest Rated" moreHref="/discover?sort=RATING_DESC" items={rated} />
            <Section title="Trending Now" moreHref="/discover?sort=COUNT_DESC" items={watched} />
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
