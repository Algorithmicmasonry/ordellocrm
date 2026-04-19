import { requireOrgContext, isOrgAccessible, isFreeRoute } from "@/lib/org-context"
import { PaywallModal } from "./paywall-modal"
import { headers } from "next/headers"

interface PaywallGuardProps {
  children: React.ReactNode
}

/**
 * Wraps page content and shows the paywall modal if:
 * - The org's trial has expired AND
 * - The current route is not a free route (Ad Tracker, etc.)
 *
 * Usage: wrap children in the dashboard shell with this component.
 */
export async function PaywallGuard({ children }: PaywallGuardProps) {
  const ctx = await requireOrgContext()

  // Check if current path is a free route — always let through
  const headersList = await headers()
  const pathname = headersList.get("x-pathname") ?? ""
  if (isFreeRoute(pathname)) return <>{children}</>

  // Org has access — let through
  if (isOrgAccessible(ctx)) return <>{children}</>

  // Trial expired + paid route — show paywall on top of blurred content
  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-sm opacity-40">
        {children}
      </div>
      <PaywallModal />
    </div>
  )
}
