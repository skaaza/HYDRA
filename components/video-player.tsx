"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { Card } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Star, Server, Film, Tv, Play } from "lucide-react"
import { Cast } from "../components/cast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import Image from "next/image"
import Link from "next/link"

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
  plot?: string
}

export interface Episode {
  id: string
  season: number
  episodeNumber: number
  title: string
  plot?: string
  primaryImage?: { url: string; width: number; height: number }
  runtimeSeconds?: number
}

interface VideoPlayerProps {
  movie: Movie
  episodes?: Episode[]
  selectedEpisode?: { season: number; episode: number } | null
  onEpisodeSelect?: (season: number, episode: number) => void
  isLoadingEpisodes?: boolean
  similarTitles?: Movie[]
  onSimilarSelect?: (movie: Movie) => void
}

type Provider = "vidsrc" | "vidfast"
type Tab = "about" | "cast"

export function VideoPlayer({
  movie,
  episodes = [],
  selectedEpisode,
  onEpisodeSelect,
  isLoadingEpisodes,
  similarTitles = [],
  onSimilarSelect,
}: VideoPlayerProps) {
  const isSeries = isSeriesType(movie.type)

  const [provider, setProvider] = useState<Provider>("vidsrc")
  const [tab, setTab] = useState<Tab>("about")

  // Slider state
  const sliderRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [hasDragged, setHasDragged] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("hydra_provider") : null
    if (saved === "vidsrc" || saved === "vidfast") setProvider(saved)
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("hydra_provider", provider)
  }, [provider])

  useEffect(() => {
    if (!isSeries || !episodes?.length) return
    if (!selectedEpisode || !Number.isFinite(selectedEpisode.season) || !Number.isFinite(selectedEpisode.episode)) {
      const first = episodes[0]
      if (first && onEpisodeSelect) onEpisodeSelect(first.season, first.episodeNumber)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSeries, episodes?.length])

  // Auto-scroll logic
  useEffect(() => {
    const slider = sliderRef.current
    if (!slider) return
    
    let animationId: number
    
    const play = () => {
      // Pause auto-scroll when dragging or hovering
      if (!isDragging && !isHovered && slider) {
        slider.scrollLeft += 0.5 // Adjust this value to change auto-scroll speed
        
        // Loop back to start if it hits the end
        if (slider.scrollLeft >= slider.scrollWidth - slider.clientWidth - 1) {
          slider.scrollLeft = 0
        }
      }
      animationId = requestAnimationFrame(play)
    }
    
    animationId = requestAnimationFrame(play)
    return () => cancelAnimationFrame(animationId)
  }, [isDragging, isHovered])

  const src = useMemo(() => {
    const key = `${provider}-${movie.id}-${isSeries ? `${selectedEpisode?.season}-${selectedEpisode?.episode}` : ""}`
    return { url: buildEmbedUrl(provider, movie, selectedEpisode), key }
  }, [provider, movie, selectedEpisode, isSeries])

  // Mouse Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setHasDragged(false)
    if (!sliderRef.current) return
    setStartX(e.pageX - sliderRef.current.offsetLeft)
    setScrollLeft(sliderRef.current.scrollLeft)
  }

  const handleMouseLeave = () => {
    setIsDragging(false)
    setIsHovered(false)
  }

  const handleMouseUp = () => setIsDragging(false)

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !sliderRef.current) return
    e.preventDefault()
    const x = e.pageX - sliderRef.current.offsetLeft
    const walk = (x - startX) * 2 // Drag speed multiplier
    sliderRef.current.scrollLeft = scrollLeft - walk
    if (Math.abs(walk) > 5) setHasDragged(true)
  }

  return (
    <div className="w-full animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="mb-6 border-b border-border/50 pb-6">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          {isSeries ? <Tv className="h-4 w-4" /> : <Film className="h-4 w-4" />}
          <span className="text-xs uppercase tracking-wider font-semibold">{prettyType(movie.type)}</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">{movie.primaryTitle}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <BadgeLite>{movie.startYear}</BadgeLite>
          {movie.genres?.slice(0, 3).map((g) => <BadgeLite key={g}>{g}</BadgeLite>)}
          {movie.rating?.aggregateRating && (
            <BadgeLite className="inline-flex items-center gap-1 font-medium bg-card">
              <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
              {movie.rating.aggregateRating.toFixed(1)}
              <span className="text-muted-foreground font-normal ml-0.5">({movie.rating.voteCount.toLocaleString()})</span>
            </BadgeLite>
          )}
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-8">
        
        {/* LEFT COLUMN (Player) */}
        <div className="flex flex-col min-w-0">
          <Card className="overflow-hidden bg-black border-border shadow-2xl rounded-2xl ring-1 ring-white/5">
            <PlayerFrame srcKey={src.key} url={src.url} />
          </Card>

          {/* NETFLIX STYLE EPISODES (Series only) */}
          {isSeries && episodes.length > 0 && (
            <div className="mt-10">
              <NetflixEpisodesList 
                episodes={episodes} 
                selectedEpisode={selectedEpisode} 
                onEpisodeSelect={onEpisodeSelect} 
                isLoading={isLoadingEpisodes} 
              />
            </div>
          )}

          {/* TABS (About / Cast) */}
          <div className="mt-10">
            <div className="flex gap-2 items-center mb-6 border-b border-border/40 pb-2">
              <button 
                onClick={() => setTab("about")}
                className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${tab === "about" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                Overview
              </button>
              <button 
                onClick={() => setTab("cast")}
                className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${tab === "cast" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                Cast
              </button>
            </div>
            
            {tab === "about" ? (
              <AboutPanel movie={movie} episodes={episodes} selectedEpisode={selectedEpisode || null} />
            ) : (
              <Cast titleId={movie.id} />
            )}

            {/* YOU MIGHT ALSO LIKE — Draggable Auto-Slider with Custom Cards */}
            {similarTitles.length > 0 && (
              <div className="mt-12 pt-8 border-t border-border/40">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold">You might also like</h3>
                  {movie.genres?.[0] && (
                    <Link href={`/discover?genre=${encodeURIComponent(movie.genres[0])}`}>
                      <Button variant="ghost" className="text-muted-foreground hover:text-foreground">See more →</Button>
                    </Link>
                  )}
                </div>
                
                <div 
                  ref={sliderRef}
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseDown={handleMouseDown}
                  onMouseLeave={handleMouseLeave}
                  onMouseUp={handleMouseUp}
                  onMouseMove={handleMouseMove}
                  onTouchStart={() => setIsDragging(true)}
                  onTouchEnd={() => setIsDragging(false)}
                  className="flex gap-4 overflow-x-auto pb-4 pt-2 -mx-2 px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden cursor-grab active:cursor-grabbing select-none"
                >
                  {similarTitles.map((sim) => (
                    <div
                      key={sim.id}
                      onClick={() => {
                        if (!hasDragged && onSimilarSelect) {
                          onSimilarSelect(sim)
                        }
                      }}
                      className="group relative flex-none w-[160px] sm:w-[180px] md:w-[200px] aspect-[2/3] rounded-xl overflow-hidden cursor-pointer shadow-lg transition-shadow bg-muted"
                    >
                      {/* Full Poster Background */}
                      {sim.primaryImage?.url && (
                        <Image
                          src={sim.primaryImage.url}
                          alt={sim.primaryTitle}
                          fill
                          draggable={false}
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      )}

                      {/* Top-left: Solid genre badge */}
                      {sim.genres?.[0] && (
                        <div className="absolute top-2.5 left-2.5 z-10">
                          <span className="bg-[#1f1f1f]/90 text-white text-[11px] font-medium px-2 py-1 rounded-md tracking-wide">
                            {sim.genres[0]}
                          </span>
                        </div>
                      )}

                      {/* Top-right: Solid rating + year stacked */}
                      <div className="absolute top-2.5 right-2.5 z-10 flex flex-col items-end gap-1.5">
                        {sim.rating?.aggregateRating && (
                          <span className="bg-[#1f1f1f]/90 text-white text-[11px] font-medium px-2 py-1 rounded-md tracking-wide flex items-center gap-1.5">
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 shrink-0" />
                            {sim.rating.aggregateRating.toFixed(1)}
                          </span>
                        )}
                        {sim.startYear && (
                          <span className="bg-[#1f1f1f]/90 text-white text-[11px] font-medium px-2 py-1 rounded-md tracking-wide">
                            {sim.startYear}
                          </span>
                        )}
                      </div>

                      {/* Bottom Gradient & Title Overlay */}
                      <div className="absolute inset-x-0 bottom-0 h-[50%] bg-gradient-to-t from-black/95 via-black/60 to-transparent p-3 flex flex-col justify-end pointer-events-none">
                        <h4 className="text-white text-sm sm:text-base font-bold truncate drop-shadow-md">
                          {sim.primaryTitle}
                        </h4>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (Servers) */}
        <div className="w-full shrink-0">
          <div className="sticky top-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <Server className="h-4 w-4" />
              Servers
            </h3>
            <div className="flex flex-col gap-3">
              <ServerCard active={provider === "vidsrc"} title="VidSrc" subtitle="Fast & reliable (Default)" onClick={() => setProvider("vidsrc")} />
              <ServerCard active={provider === "vidfast"} title="VidFast" subtitle="Alternative streaming" onClick={() => setProvider("vidfast")} />
            </div>
            <p className="text-[11px] text-muted-foreground mt-6 leading-relaxed">
              If the video is buffering or fails to load, try switching to an alternative server.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}

/* ───────────────────────── NETFLIX STYLE EPISODES ───────────────────────── */

function NetflixEpisodesList({
  episodes,
  selectedEpisode,
  onEpisodeSelect,
  isLoading
}: {
  episodes: Episode[]
  selectedEpisode: { season: number; episode: number } | null
  onEpisodeSelect?: (s: number, e: number) => void
  isLoading?: boolean
}) {
  const seasons = Array.from(new Set(episodes.map((e) => e.season))).sort((a, b) => a - b)
  const [activeSeason, setActiveSeason] = useState(selectedEpisode?.season || seasons[0] || 1)

  useEffect(() => {
    if (selectedEpisode?.season) {
      setActiveSeason(selectedEpisode.season)
    }
  }, [selectedEpisode?.season])

  const seasonEpisodes = episodes.filter((e) => e.season === activeSeason).sort((a, b) => a.episodeNumber - b.episodeNumber)

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold">Episodes</h3>
        <Select value={String(activeSeason)} onValueChange={(val) => setActiveSeason(Number(val))}>
          <SelectTrigger className="w-[160px] bg-card border-border">
            <SelectValue placeholder="Select Season" />
          </SelectTrigger>
          <SelectContent>
            {seasons.map((s) => (
              <SelectItem key={s} value={String(s)}>Season {s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl bg-card border border-border animate-pulse" />)}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {seasonEpisodes.map((ep) => {
            const isActive = selectedEpisode?.season === ep.season && selectedEpisode?.episode === ep.episodeNumber
            return (
              <div
                key={ep.id}
                onClick={() => onEpisodeSelect?.(ep.season, ep.episodeNumber)}
                className={`group flex flex-col sm:flex-row gap-4 p-3 rounded-xl transition-all cursor-pointer border ${
                  isActive 
                    ? "bg-primary/5 border-primary/30" 
                    : "bg-transparent border-transparent hover:bg-card hover:border-border"
                }`}
              >
                <div className="relative w-full sm:w-48 aspect-video shrink-0 bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                  {ep.primaryImage?.url ? (
                    <Image src={ep.primaryImage.url} alt={ep.title} fill className="object-cover transition-transform group-hover:scale-105" />
                  ) : (
                    <Tv className="h-8 w-8 text-muted-foreground/30" />
                  )}
                  <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                    <Play className={`h-8 w-8 ${isActive ? "text-primary" : "text-white"}`} fill="currentColor" />
                  </div>
                  {ep.runtimeSeconds && (
                    <div className="absolute bottom-1.5 right-1.5 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-medium text-white backdrop-blur-sm">
                      {Math.round(ep.runtimeSeconds / 60)}m
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 py-1">
                  <div className="flex justify-between items-start mb-1.5">
                    <h4 className={`text-sm sm:text-base font-semibold truncate pr-4 ${isActive ? "text-primary" : "text-foreground group-hover:text-primary transition-colors"}`}>
                      {ep.episodeNumber}. {ep.title}
                    </h4>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                    {ep.plot || "No description available for this episode."}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ───────────────────────── HELPERS ───────────────────────── */

function PlayerFrame({ srcKey, url }: { srcKey: string; url: string }) {
  return (
    <div className="relative aspect-video w-full bg-black">
      <iframe
        key={srcKey}
        src={url}
        title="Video Player"
        className="w-full h-full border-0"
        allowFullScreen
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        referrerPolicy="no-referrer"
        loading="lazy"
      />
    </div>
  )
}

function ServerCard({ active, title, subtitle, onClick }: { active: boolean; title: string; subtitle: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
        active 
          ? "bg-primary/10 border-primary/50 ring-1 ring-primary/20" 
          : "bg-card border-border hover:border-border/80 hover:bg-muted/50"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <h4 className={`text-sm font-semibold ${active ? "text-primary" : "text-foreground"}`}>{title}</h4>
          <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
        <div className={`w-2 h-2 rounded-full ${active ? "bg-primary shadow-[0_0_8px_rgba(var(--primary),0.8)]" : "bg-muted-foreground/30"}`} />
      </div>
    </button>
  )
}

function BadgeLite({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={["inline-flex items-center rounded-md border border-border/50 bg-muted/30 px-2 py-0.5 text-xs text-muted-foreground", className || ""].join(" ")}>
      {children}
    </span>
  )
}

function prettyType(t: string) {
  const u = (t || "").toUpperCase()
  if (u === "TVSERIES" || u === "TV_SERIES") return "TV Show"
  if (u === "TVMINISERIES" || u === "TV_MINI_SERIES") return "Mini-Series"
  if (u === "MOVIE") return "Movie"
  return t
}

function isSeriesType(type?: string) {
  const normalized = (type || "").toUpperCase()
  return normalized === "TVSERIES" || normalized === "TV_SERIES"
}

function getProviderId(id: string) {
  return id.replace(/^tmdb-(movie|tv)-/, "")
}

function buildEmbedUrl(provider: "vidsrc" | "vidfast", movie: Movie, sel?: { season: number; episode: number } | null) {
  const isSeries = isSeriesType(movie.type)
  const providerId = getProviderId(movie.id)
  if (provider === "vidfast") {
    if (isSeries && sel?.season && sel?.episode) {
      return `https://vidfast.pro/tv/${providerId}/${sel.season}/${sel.episode}?autoPlay=true&title=false&poster=false&nextButton=true&autoNext=true`
    }
    return `https://vidfast.pro/movie/${providerId}?autoPlay=true&title=false&poster=false`
  }
  if (isSeries && sel?.season && sel?.episode) {
    return `https://vidsrc.to/embed/tv/${providerId}/${sel.season}/${sel.episode}`
  }
  return `https://vidsrc.to/embed/movie/${providerId}`
}

function AboutPanel({ movie, episodes, selectedEpisode }: { movie: Movie; episodes: Episode[]; selectedEpisode: { season: number; episode: number } | null }) {
  const epPlot = selectedEpisode ? episodes.find((e) => e.season === selectedEpisode.season && e.episodeNumber === selectedEpisode.episode)?.plot : null
  const plot = epPlot || movie.plot || "No description available."
  const mins = typeof movie.runtimeSeconds === "number" && movie.runtimeSeconds > 0 ? Math.round(movie.runtimeSeconds / 60) : undefined

  return (
    <div className="text-sm">
      <p className="text-muted-foreground text-base leading-relaxed mb-6 whitespace-pre-line">{plot}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 border-t border-border/40 pt-6">
        <LabelRow label="Release Year" value={String(movie.startYear)} />
        <LabelRow label="Genres" value={(movie.genres || []).join(", ") || "—"} />
        <LabelRow label="Runtime" value={mins ? `${mins} min` : "—"} />
        <LabelRow label="TMDB Rating" value={movie.rating?.aggregateRating ? `${movie.rating.aggregateRating.toFixed(1)} / 10` : "—"} />
      </div>
    </div>
  )
}

function LabelRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  )
}
