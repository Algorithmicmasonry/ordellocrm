"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Zap, Loader2 } from "lucide-react"
import { TOKEN_PACKS, type TokenPackId } from "@/lib/ai-tokens"
import { initializeTokenPurchase } from "../actions"

interface TokenPacksProps {
  balance: number
}

export function TokenPacks({ balance }: TokenPacksProps) {
  const [loading, setLoading] = useState<TokenPackId | null>(null)

  async function handleBuy(packId: TokenPackId) {
    setLoading(packId)
    const result = await initializeTokenPurchase(packId)
    if (!result.success) {
      alert(result.error)
      setLoading(null)
      return
    }
    window.location.href = result.authorizationUrl!
  }

  const isLow = balance <= 10

  return (
    <div className="space-y-6">
      {/* Balance card */}
      <div className={`rounded-xl p-6 border-2 ${isLow ? "border-red-300 bg-red-50" : "border-primary/20 bg-primary/5"}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Current Token Balance</p>
            <p className={`text-4xl font-bold mt-1 ${isLow ? "text-red-600" : "text-primary"}`}>
              {balance} <span className="text-lg font-normal">tokens</span>
            </p>
            {isLow && (
              <p className="text-red-600 text-sm font-medium mt-1">
                ⚠ Low balance — buy more tokens to keep AI calls running
              </p>
            )}
            {!isLow && (
              <p className="text-muted-foreground text-sm mt-1">
                1 token = 1 call minute
              </p>
            )}
          </div>
          <Zap className={`h-12 w-12 ${isLow ? "text-red-400" : "text-primary/40"}`} />
        </div>
      </div>

      {/* Token packs */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Buy Token Pack</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {(Object.entries(TOKEN_PACKS) as [TokenPackId, typeof TOKEN_PACKS[TokenPackId]][]).map(([packId, pack]) => (
            <div
              key={packId}
              className={`border-2 rounded-xl p-5 space-y-4 ${packId === "pack_150" ? "border-primary" : ""}`}
            >
              {packId === "pack_150" && (
                <div className="text-xs font-semibold text-primary">Best Value</div>
              )}
              <div>
                <h3 className="font-bold text-lg">{pack.label}</h3>
                <p className="text-3xl font-bold mt-1">
                  {pack.tokens} <span className="text-base font-normal text-muted-foreground">tokens</span>
                </p>
                <p className="text-muted-foreground text-sm">
                  ₦{(pack.amount / 100).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{pack.perMin}</p>
              </div>
              <Button
                className="w-full"
                variant={packId === "pack_150" ? "default" : "outline"}
                disabled={!!loading}
                onClick={() => handleBuy(packId)}
              >
                {loading === packId ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing...</>
                ) : (
                  "Buy Now"
                )}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
