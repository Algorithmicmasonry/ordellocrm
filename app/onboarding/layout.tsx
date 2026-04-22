import { redirect } from "next/navigation"
import { getOrgContext } from "@/lib/org-context"

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const result = await getOrgContext()
  if (result.status === "unauthenticated") redirect("/login")
  if (result.status === "ok") redirect("/dashboard")
  // status === "no_org" → user is authenticated but hasn't onboarded yet, show the page
  return <>{children}</>
}
