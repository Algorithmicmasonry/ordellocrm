import { NextRequest, NextResponse } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

// Routes that never require auth
const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/order-form",
  "/api/auth",
  "/api/products/available",
  "/api/vapi/webhook",
  "/api/whatsapp",
  "/api/cron",
]

// Routes that are always free (Ad Tracker lead magnet + sandbox)
export const FREE_ROUTES = [
  "/dashboard/admin/utm",
  "/dashboard/admin/ai-sandbox",
]

function isPublic(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  )
}

export function isFreeRoute(pathname: string): boolean {
  return FREE_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  )
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes through
  if (isPublic(pathname)) return NextResponse.next()

  // Check for session cookie
  const sessionCookie = getSessionCookie(request)
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Free routes don't need subscription check — pass through
  // (subscription check happens in the page/layout for better UX)
  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
