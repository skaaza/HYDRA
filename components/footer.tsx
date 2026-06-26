"use client"

import Image from "next/image"

interface FooterProps {
  onLogoClick?: () => void
}

export default function Footer({ onLogoClick }: FooterProps) {
  return (
    <footer className="py-8 border-t border-border text-center mt-auto">
      <p className="text-muted-foreground text-xs mt-3 leading-relaxed">
        © {new Date().getFullYear()} Hydra.
      </p>
    </footer>
  )
}
