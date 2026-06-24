"use client"

import Image from "next/image"

interface FooterProps {
  onLogoClick?: () => void
}

export default function Footer({ onLogoClick }: FooterProps) {
  return (
    <footer className="py-8 border-t border-border text-center mt-auto">
      <p className="text-muted-foreground text-xs mt-3 leading-relaxed">
        © 2025 Hydra. All rights reserved.
        <br />
        Hydra uses the various API for streaming and{" "}
        <span className="font-semibold text-primary">The Movie Database</span> for fetching info from the TMDB database — we do
        not host or upload any videos.
      </p>
    </footer>
  )
}
