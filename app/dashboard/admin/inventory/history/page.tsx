import { DashboardHeader } from "../../_components"
import { getStockMovements, getProductsForFilter } from "@/app/actions/stock-movements"
import StockHistoryClient from "./_components/stock-history-client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export const metadata = {
  title: "Stock Movement History",
}

export default async function StockHistoryPage() {
  const [movementsResult, productsResult] = await Promise.all([
    getStockMovements({ page: 1 }),
    getProductsForFilter(),
  ])

  const movements = movementsResult.success && movementsResult.data
    ? movementsResult.data.movements
    : []
  const total = movementsResult.success && movementsResult.data
    ? movementsResult.data.total
    : 0
  const totalPages = movementsResult.success && movementsResult.data
    ? movementsResult.data.totalPages
    : 0
  const products = productsResult.success && productsResult.products
    ? productsResult.products
    : []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/admin/inventory">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="size-4 mr-2" />
            Back to Inventory
          </Button>
        </Link>
      </div>

      <DashboardHeader
        heading="Stock Movement History"
        text="Complete audit trail of all inventory changes — additions, distributions, deliveries, returns, and corrections."
      />

      <StockHistoryClient
        initialMovements={movements as any}
        initialTotal={total}
        initialPage={1}
        initialTotalPages={totalPages}
        products={products}
      />
    </div>
  )
}
