import { redirect } from "next/navigation"
import { requireOrgContext } from "@/lib/org-context"
import { CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface Props {
  searchParams: Promise<{ reference?: string }>
}

export default async function TokenVerifyPage({ searchParams }: Props) {
  const { reference } = await searchParams
  await requireOrgContext()

  if (!reference) redirect("/dashboard/admin/ai-tokens")

  const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    cache: "no-store",
  })

  const data = await res.json()

  if (!data.status || data.data.status !== "success") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <h1 className="text-2xl font-bold text-red-600">Payment not confirmed</h1>
          <p className="text-muted-foreground">
            We could not verify your token purchase. If you were charged, please contact support.
          </p>
          <Link href="/dashboard/admin/ai-tokens">
            <Button variant="outline">Back to Tokens</Button>
          </Link>
        </div>
      </div>
    )
  }

  const tokens = data.data.metadata?.tokens ?? 0

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold mb-2">Tokens added!</h1>
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">{tokens} tokens</span> have been added to your account.
          </p>
        </div>
        <Link href="/dashboard/admin/ai-tokens">
          <Button size="lg" className="w-full">View Token Balance</Button>
        </Link>
      </div>
    </div>
  )
}
