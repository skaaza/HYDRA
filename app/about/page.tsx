
import { Card } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import Footer from "@/components/footer"
import Link from "next/link"
import { Shield, Film, Network, HelpCircle, AlertTriangle, ExternalLink } from "lucide-react"

export const metadata = {
  title: "About — Hydra",
  description:
    "Learn what Hydra is, how it works, and find answers to common questions about streaming, data sources, and more.",
}

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 space-y-8">
        <section className="text-center space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">About Hydra</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know about Hydra — what it is, how it works, and answers to frequently asked questions.
          </p>

        </section>

        <Card className="rounded-2xl border-border bg-card/80 backdrop-blur-sm">
          <div className="p-6 md:p-8 space-y-3">
            <div className="flex items-center gap-2">
              <Film className="h-5 w-5 text-primary" />
              <h2 className="text-xl md:text-2xl font-semibold">What is Hydra?</h2>
            </div>
            <p className="text-muted-foreground">
              Hydra is a lightweight streaming helper. It lets you <span className="text-foreground font-medium">search titles,
              browse details, and play content</span> using an external streaming provider — without the need to create an account
              on Hydra itself.
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Fast, minimal UI focused on finding and watching.</li>
              <li>Accurate search with filters (year, rating, genres, and more).</li>
              <li>Direct, clean player integration with episode selection for TV series.</li>
            </ul>
          </div>
        </Card>

        <Card className="rounded-2xl border-border bg-card/80 backdrop-blur-sm">
          <div className="p-6 md:p-8 space-y-3">
            <div className="flex items-center gap-2">
              <Network className="h-5 w-5 text-primary" />
              <h2 className="text-xl md:text-2xl font-semibold">How does it work?</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h3 className="font-medium">Data Sources</h3>
                <p className="text-muted-foreground">
                  Title information (metadata like posters, ratings, cast, and genres) is fetched from{" "}
                  <span className="text-foreground font-medium">The Movie Database</span>. Hydra does not store or modify that data — it simply displays it.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium">Streaming</h3>
                <p className="text-muted-foreground">
                  Playback is provided by an <span className="text-foreground font-medium">external streaming provider</span> via an embed player.
                  Hydra does not host or upload any videos; availability and quality depend on the external provider.
                </p>
              </div>
            </div>
            <div className="pt-2">
              <Link href="/discover">
                <Button variant="secondary">Start discovering</Button>
              </Link>
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border-border bg-card/80 backdrop-blur-sm">
          <div className="p-6 md:p-8 space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="text-xl md:text-2xl font-semibold">Disclaimer</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>
                Hydra <span className="text-foreground font-medium">does not host</span> any media files and is <span className="text-foreground font-medium">not responsible</span> for the
                availability of specific titles, episodes, or audio tracks. Content availability is fully controlled by the external provider.
              </p>
              <p>
                Posters, ratings, genres, and cast data are provided by third-party APIs and may contain inaccuracies. Hydra displays that data as-is.
              </p>
              <div className="flex items-start gap-2 p-3 rounded-xl border border-border">
                <AlertTriangle className="h-4 w-4 mt-1 text-yellow-500" />
                <p className="text-sm">
                  If something doesn’t play or metadata looks wrong, try another title, refresh later, or check the external provider’s status.
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border-border bg-card/80 backdrop-blur-sm">
          <div className="p-6 md:p-8 space-y-6">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              <h2 className="text-xl md:text-2xl font-semibold">FAQ</h2>
            </div>

            <div className="space-y-5">
              <FaqItem
                q="Does Hydra host any videos?"
                a="No. Hydra integrates an external player (embed) provided by a third party. Hydra does not host or upload any content."
              />
              <FaqItem
                q="Why is a title missing or a link not working?"
                a="Availability depends on the external streaming provider. If something is missing or broken, it usually resolves on the provider side. You can try again later or choose another title."
              />
              <FaqItem
                q="Is Hydra free to use?"
                a="Yes. Hydra does not charge users. It functions as a search and playback helper around external sources."
              />
              <FaqItem
                q="How accurate are ratings and posters?"
                a="All metadata comes from third-party APIs (like The Movie Database). Hydra does not edit that data and simply displays it."
              />
              <FaqItem
                q="Can I request features or report an issue?"
                a={
                  <>
                    Absolutely. Please open an issue or reach out. If you use an ad/tracker blocker (e.g. uBlock Origin),
                    your experience may be faster and cleaner.{" "}
                    <a
                      href="https://ublockorigin.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 underline decoration-dotted underline-offset-4"
                    >
                      Learn more <ExternalLink className="h-3 w-3" />
                    </a>
                  </>
                }
              />
            </div>
          </div>
        </Card>

        <section className="text-center pt-2">
          <div className="inline-flex items-center gap-3">
            <Link href="/discover">
              <Button>Browse Discover</Button>
            </Link>
            <Link href="/">
              <Button variant="outline">Back to Home</Button>
            </Link>
          </div>
        </section>
      </div>
<Footer  />

    </main>
  )
}

function FaqItem({ q, a }: { q: string; a: React.ReactNode }) {
  return (
    <details className="group rounded-xl border border-border bg-background/40">
      <summary className="cursor-pointer select-none list-none p-4 md:p-5 flex items-center justify-between gap-4">
        <span className="font-medium">{q}</span>
        <span className="text-muted-foreground transition-transform group-open:rotate-180">⌄</span>
      </summary>
      <div className="px-4 pb-4 md:px-5 md:pb-5 text-muted-foreground">{a}</div>
    </details>
  )
}
