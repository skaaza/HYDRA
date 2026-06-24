import Link from "next/link"
import { ArrowRight, CalendarDays, CheckCircle2, CircleDot, Film, Sparkles, Wrench } from "lucide-react"
import Footer from "@/components/footer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export const metadata = {
  title: "Changelog - Hydra",
  description: "Track Hydra updates, improvements, fixes, and upcoming work.",
}

const releases = [
  {
    version: "1.2.1",
    date: "June 2026",
    title: "TMDB metadata migration",
    summary:
      "Hydra now uses The Movie Database for movie search, discovery, posters, ratings, cast, and release metadata.",
    type: "Latest",
    highlights: ["TMDB API", "Resilient home", "Metadata routes"],
    changes: [
      "Replaced imdbapi.dev-backed movie metadata routes with TMDB-backed search, title lookup, discovery, genres, home sections, cast, and latest-title APIs.",
      "Expanded TMDB search and discovery to include TV series such as Breaking Bad and Peaky Blinders alongside movies.",
      "Added normalized TMDB movie IDs and image handling while keeping the existing app UI data shape intact.",
      "Updated player embeds so TMDB-prefixed internal IDs are converted before being sent to streaming providers.",
      "Made home sections fail gracefully when TMDB credentials are missing or one upstream section fails.",
    ],
  },
  {
    version: "1.2",
    date: "June 2026",
    title: "Discovery and playback polish",
    summary:
      "Hydra now feels faster to browse, cleaner to filter, and more dependable when jumping between movies and series.",
    type: "Improvement",
    highlights: ["Discover filters", "Episode URL sync", "Home sections"],
    changes: [
      "Added a dedicated Discover experience with title search, genre filters, type filters, year bounds, rating filters, and sortable results.",
      "Improved TV series playback by syncing selected season and episode into the URL.",
      "Added Latest Releases, Highest Rated, and Trending Now sections to the home screen.",
      "Tightened title filtering so low-signal results without posters or usable rating data stay out of main grids.",
    ],
  },
  {
    version: "1.1",
    date: "May 2026",
    title: "Cleaner browsing flow",
    summary:
      "Search, suggestions, and related titles were refined so users can move from query to playback with fewer interruptions.",
    type: "Improvement",
    highlights: ["Search suggestions", "Similar titles", "Player layout"],
    changes: [
      "Added debounced search suggestions with poster and rating quality checks.",
      "Introduced similar-title recommendations based on the selected title's primary genre.",
      "Improved loading states for player metadata, episodes, and content grids.",
    ],
  },
  {
    version: "1.0",
    date: "April 2026",
    title: "Initial Hydra experience",
    summary:
      "The first usable version focused on quick search, direct playback, and a minimal interface around third-party metadata.",
    type: "Launch",
    highlights: ["Movie search", "Streaming embed", "TMDB metadata"],
    changes: [
      "Launched the main search and playback flow.",
      "Added title metadata from The Movie Database including posters, ratings, runtime, genres, and release year.",
      "Added core navigation, branding, and the About page with usage and source details.",
    ],
  },
]

const stats = [
  { label: "Current version", value: "1.2.1" },
  { label: "Release notes", value: releases.length.toString() },
  { label: "Focus", value: "Streaming UX" },
]

const roadmap = [
  "More resilient metadata fallbacks for missing posters and ratings.",
  "Better episode grouping for long-running TV series.",
  "Additional discovery presets for popular moods and genres.",
]

export default function ChangelogPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-6xl px-4 py-10 md:py-12">
        <section className="grid gap-8 lg:grid-cols-[1fr_340px] lg:items-end">
          <div className="space-y-5">
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
              <Sparkles className="h-3 w-3" />
              Product updates
            </Badge>
            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight md:text-5xl">Changelog</h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                A running timeline of Hydra releases, interface improvements, playback fixes, and discovery updates.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/discover">
                  Browse Discover
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/">Back to Home</Link>
              </Button>
            </div>
          </div>

          <Card className="rounded-2xl border-border bg-card/80 p-5 backdrop-blur-sm">
            <div className="grid grid-cols-3 gap-3">
              {stats.map((item) => (
                <div key={item.label} className="rounded-xl border border-border bg-background/40 p-3">
                  <div className="text-lg font-semibold tracking-tight">{item.value}</div>
                  <div className="mt-1 text-[11px] leading-4 text-muted-foreground">{item.label}</div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="mt-12 grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="relative">
            <div className="absolute left-4 top-2 hidden h-[calc(100%-1rem)] w-px bg-border md:block" />
            <div className="space-y-6">
              {releases.map((release, index) => (
                <article key={release.version} className="relative md:pl-12">
                  <div className="absolute left-0 top-6 hidden h-8 w-8 items-center justify-center rounded-full border border-primary/40 bg-background text-primary shadow-[0_0_20px_rgba(220,38,38,0.18)] md:flex">
                    {index === 0 ? <CircleDot className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  </div>

                  <Card className="rounded-2xl border-border bg-card/80 backdrop-blur-sm">
                    <div className="p-5 md:p-6">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className="bg-primary text-primary-foreground">v{release.version}</Badge>
                            <Badge variant="secondary">{release.type}</Badge>
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <CalendarDays className="h-3.5 w-3.5" />
                              {release.date}
                            </span>
                          </div>
                          <h2 className="text-xl font-semibold tracking-tight md:text-2xl">{release.title}</h2>
                          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{release.summary}</p>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        {release.highlights.map((highlight) => (
                          <span
                            key={highlight}
                            className="rounded-md border border-border bg-background/50 px-2.5 py-1 text-xs text-muted-foreground"
                          >
                            {highlight}
                          </span>
                        ))}
                      </div>

                      <ul className="mt-5 space-y-3">
                        {release.changes.map((change) => (
                          <li key={change} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                            <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
                            <span>{change}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </Card>
                </article>
              ))}
            </div>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-28 lg:h-fit">
            <Card className="rounded-2xl border-border bg-card/80 p-5 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Coming next</h2>
              </div>
              <ul className="mt-4 space-y-3">
                {roadmap.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                    <CircleDot className="mt-1 h-4 w-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="rounded-2xl border-border bg-card/80 p-5 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <Film className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Release rhythm</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Updates focus on practical browsing and playback improvements first: better search quality, clearer
                filters, stronger episode handling, and cleaner page states.
              </p>
            </Card>
          </aside>
        </section>
      </div>
      <Footer />
    </main>
  )
}
