import { NextResponse } from "next/server"

export function GET(request: Request) {
  const url = new URL(request.url)
  url.pathname = "/api/discover/interests"
  return NextResponse.redirect(url)
}
