import { requireOrgContext } from "@/lib/org-context"
import { getTokenData } from "./actions"
import { TokenPacks } from "./_components/token-packs"
import { Phone, ShoppingCart } from "lucide-react"

export default async function AiTokensPage() {
  await requireOrgContext()
  const { balance, transactions } = await getTokenData()

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">AI Call Tokens</h1>
        <p className="text-muted-foreground mt-1">
          Tokens power your AI agent calls. 1 token = 1 minute of AI calling.
        </p>
      </div>

      <TokenPacks balance={balance} />

      {/* Transaction history */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Token History</h2>
        {transactions.length === 0 ? (
          <div className="border rounded-xl p-8 text-center text-muted-foreground text-sm">
            No token transactions yet. Buy your first pack to get started.
          </div>
        ) : (
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tokens</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Balance After</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Details</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {tx.type === "PURCHASE" ? (
                          <ShoppingCart className="h-4 w-4 text-green-600" />
                        ) : (
                          <Phone className="h-4 w-4 text-blue-600" />
                        )}
                        <span className={tx.type === "PURCHASE" ? "text-green-700 font-medium" : "text-muted-foreground"}>
                          {tx.type === "PURCHASE" ? "Purchase" : "Call used"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={tx.tokens > 0 ? "text-green-700 font-medium" : "text-foreground"}>
                        {tx.tokens > 0 ? `+${tx.tokens}` : tx.tokens}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{tx.balanceAfter}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {tx.type === "PURCHASE" && tx.amountPaid
                        ? `₦${(tx.amountPaid / 100).toLocaleString()} paid`
                        : tx.vapiDuration
                        ? `${tx.vapiDuration}s call`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
