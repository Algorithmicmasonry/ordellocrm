"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  History,
  Loader2,
} from "lucide-react"
import { getStockMovements } from "@/app/actions/stock-movements"
import type { StockMovementType } from "@prisma/client"

const MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  STOCK_ADDED: "Stock Added",
  DISTRIBUTED_TO_AGENT: "Distributed to Agent",
  DELIVERED: "Delivered",
  DELIVERY_REVERSED: "Delivery Reversed",
  RETURNED_FROM_AGENT: "Returned from Agent",
  CORRECTION: "Correction",
}

const MOVEMENT_TYPE_VARIANTS: Record<StockMovementType, "default" | "secondary" | "destructive" | "outline"> = {
  STOCK_ADDED: "default",
  DISTRIBUTED_TO_AGENT: "secondary",
  DELIVERED: "destructive",
  DELIVERY_REVERSED: "outline",
  RETURNED_FROM_AGENT: "default",
  CORRECTION: "outline",
}

type Movement = {
  id: string
  productId: string
  type: StockMovementType
  quantity: number
  balanceAfter: number
  agentId: string | null
  orderId: string | null
  userId: string | null
  note: string | null
  createdAt: Date
  product: { id: string; name: string }
  userName: string | null
  agentName: string | null
}

type ProductOption = { id: string; name: string }

interface StockHistoryClientProps {
  initialMovements: Movement[]
  initialTotal: number
  initialPage: number
  initialTotalPages: number
  products: ProductOption[]
}

export default function StockHistoryClient({
  initialMovements,
  initialTotal,
  initialPage,
  initialTotalPages,
  products,
}: StockHistoryClientProps) {
  const [movements, setMovements] = useState(initialMovements)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(initialPage)
  const [totalPages, setTotalPages] = useState(initialTotalPages)

  const [productId, setProductId] = useState<string>("")
  const [type, setType] = useState<string>("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const [isPending, startTransition] = useTransition()

  const fetchMovements = (newPage: number) => {
    startTransition(async () => {
      const result = await getStockMovements({
        page: newPage,
        productId: productId || undefined,
        type: (type || undefined) as StockMovementType | undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      })

      if (result.success && result.data) {
        setMovements(result.data.movements as Movement[])
        setTotal(result.data.total)
        setPage(result.data.page)
        setTotalPages(result.data.totalPages)
      }
    })
  }

  const handleFilter = () => {
    fetchMovements(1)
  }

  const handleClearFilters = () => {
    setProductId("")
    setType("")
    setStartDate("")
    setEndDate("")
    startTransition(async () => {
      const result = await getStockMovements({ page: 1 })
      if (result.success && result.data) {
        setMovements(result.data.movements as Movement[])
        setTotal(result.data.total)
        setPage(result.data.page)
        setTotalPages(result.data.totalPages)
      }
    })
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="size-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger>
                <SelectValue placeholder="All Products" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MOVEMENT_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Start Date"
            />

            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="End Date"
            />

            <div className="flex gap-2">
              <Button onClick={handleFilter} disabled={isPending} className="flex-1">
                {isPending ? <Loader2 className="size-4 animate-spin" /> : "Apply"}
              </Button>
              <Button variant="outline" onClick={handleClearFilters} disabled={isPending}>
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <History className="size-5" />
              Stock Movements
            </span>
            <span className="text-sm font-normal text-muted-foreground">
              {total} total records
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No stock movements found.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Balance After</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>By</TableHead>
                      <TableHead>Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDate(m.createdAt)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {m.product.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant={MOVEMENT_TYPE_VARIANTS[m.type]}>
                            {MOVEMENT_TYPE_LABELS[m.type]}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-right font-mono font-medium ${m.quantity > 0 ? "text-green-600" : "text-red-600"}`}>
                          {m.quantity > 0 ? "+" : ""}{m.quantity}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {m.balanceAfter}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {m.agentName ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {m.orderId ? (
                            <a
                              href={`/dashboard/admin/orders?search=${m.orderId}`}
                              className="underline hover:text-foreground"
                            >
                              View
                            </a>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {m.userName ?? "System"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {m.note ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchMovements(page - 1)}
                      disabled={page <= 1 || isPending}
                    >
                      <ChevronLeft className="size-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchMovements(page + 1)}
                      disabled={page >= totalPages || isPending}
                    >
                      Next
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
