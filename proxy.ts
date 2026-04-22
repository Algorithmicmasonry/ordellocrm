import { NextRequest, NextResponse } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

// Routes that never require auth
const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/onboarding",
  "/billing",
  "/order-form",
  "/api/auth",
  "/api/paystack",
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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes through
  if (isPublic(pathname)) return NextResponse.next()

  // Check for session cookie
  const sessionCookie = getSessionCookie(request)
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Pass pathname as a header so server components can read it
  // (Next.js doesn't expose the current pathname to server components directly)
  const response = NextResponse.next()
  response.headers.set("x-pathname", pathname)
  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm|ogg|mov)$).*)",
  ],
}
