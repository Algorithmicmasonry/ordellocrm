import { redirect } from "next/navigation"
import { requireOrgContext } from "@/lib/org-context"
import { CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface Props {
  searchParams: Promise<{ reference?: string }>
}

export default async function BillingVerifyPage({ searchParams }: Props) {
  const { reference } = await searchParams
  await requireOrgContext()

  if (!reference) redirect("/billing")

  // Verify the payment with Paystack
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
            We could not verify your payment. If you were charged, please contact support.
          </p>
          <Link href="/billing">
            <Button variant="outline">Back to Billing</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Payment confirmed - webhook will handle DB update
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold mb-2">Payment successful!</h1>
          <p className="text-muted-foreground">
            Your subscription is now active. Welcome to Ordello.
          </p>
        </div>
        <Link href="/dashboard">
          <Button size="lg" className="w-full">Go to Dashboard</Button>
        </Link>
      </div>
    </div>
  )
}

