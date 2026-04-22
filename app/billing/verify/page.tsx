import { redirect } from "next/navigation"
import { requireOrgContext } from "@/lib/org-context"
import { CheckCircle2, AlertCircle, Clock } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface Props {
  searchParams: Promise<{ reference?: string }>
}

export default async function BillingVerifyPage({ searchParams }: Props) {
  const { reference } = await searchParams
  await requireOrgContext()

  if (!reference) redirect("/billing")

  // If the key isn't configured we can't verify — but the webhook will still
  // activate the org. Show a "pending" state rather than a false failure.
  if (!process.env.PAYSTACK_SECRET_KEY) {
    return <PendingScreen />
  }

  let verified = false
  try {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      cache: "no-store",
    })
    const data = await res.json()
    verified = data.status === true && data.data?.status === "success"
  } catch {
    // Network or parse error — fall through to pending screen
    return <PendingScreen />
  }

  if (!verified) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold">Payment not confirmed</h1>
          <p className="text-muted-foreground text-sm">
            We could not verify your payment with Paystack. If you were charged,
            your subscription will activate automatically within a few minutes.
            Check your dashboard or contact{" "}
            <a href="mailto:hello@ordello.com" className="text-primary underline">
              hello@ordello.com
            </a>{" "}
            if it doesn&apos;t.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/dashboard">
              <Button variant="outline">Go to Dashboard</Button>
            </Link>
            <Link href="/billing">
              <Button variant="ghost">Back to Billing</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

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

function PendingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100">
          <Clock className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold">Payment received</h1>
        <p className="text-muted-foreground text-sm">
          Your payment was received by Paystack. Your subscription will activate
          automatically within a few minutes. Check your dashboard — if it&apos;s
          not active after 5 minutes, contact{" "}
          <a href="mailto:hello@ordello.com" className="text-primary underline">
            hello@ordello.com
          </a>
          .
        </p>
        <Link href="/dashboard">
          <Button size="lg" className="w-full">Go to Dashboard</Button>
        </Link>
      </div>
    </div>
  )
}

