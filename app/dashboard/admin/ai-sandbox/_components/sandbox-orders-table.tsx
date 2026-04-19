"use client";

import { useState } from "react";
import { deleteSandboxOrder, deleteAllSandboxOrders } from "../actions";
import { OrderStatus } from "@prisma/client";

interface SandboxOrder {
  id: string;
  orderNumber: number;
  customerName: string;
  customerPhone: string;
  status: OrderStatus;
  totalAmount: number;
  currency: string;
  createdAt: Date;
  assignedTo?: { id: string; name: string } | null;
  items?: Array<{
    id: string;
    quantity: number;
    price: number;
    product: { id: string; name: string };
  }>;
}

interface SandboxOrdersTableProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  orders: any[];
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  NEW: "bg-blue-100 text-blue-800",
  CONFIRMED: "bg-green-100 text-green-800",
  DISPATCHED: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-red-100 text-red-800",
  POSTPONED: "bg-yellow-100 text-yellow-800",
  NOT_REACHABLE: "bg-orange-100 text-orange-800",
  NOT_PICKING_CALLS: "bg-gray-100 text-gray-800",
};

export function SandboxOrdersTable({ orders: initialOrders }: SandboxOrdersTableProps) {
  const [orders, setOrders] = useState(initialOrders);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete(orderId: string) {
    setDeletingId(orderId);
    setError("");
    const result = await deleteSandboxOrder(orderId);
    if (result.success) {
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } else {
      setError(result.error ?? "Failed to delete order");
    }
    setDeletingId(null);
  }

  async function handleClearAll() {
    if (!confirm(`Delete all ${orders.length} sandbox orders? This cannot be undone.`)) return;
    setClearingAll(true);
    setError("");
    const result = await deleteAllSandboxOrders();
    if (result.success) {
      setOrders([]);
    } else {
      setError(result.error ?? "Failed to clear orders");
    }
    setClearingAll(false);
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground text-sm">
        No sandbox orders yet. Submit a test order using the form above.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
          {error}
        </div>
      )}

      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{orders.length} sandbox order{orders.length !== 1 ? "s" : ""}</p>
        <button
          onClick={handleClearAll}
          disabled={clearingAll}
          className="text-xs text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
        >
          {clearingAll ? "Clearing..." : "Clear All"}
        </button>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">#</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Phone</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Product</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Assigned To</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Created</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  #{order.orderNumber}
                </td>
                <td className="px-4 py-3 font-medium">{order.customerName}</td>
                <td className="px-4 py-3 text-muted-foreground">{order.customerPhone}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {(order.items ?? []).map((i: { quantity: number; product: { name: string } }) => `${i.quantity}× ${i.product.name}`).join(", ")}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[order.status as OrderStatus] ?? "bg-gray-100 text-gray-800"}`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {order.assignedTo?.name ?? "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {new Date(order.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(order.id)}
                    disabled={deletingId === order.id}
                    className="text-xs text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                  >
                    {deletingId === order.id ? "Deleting…" : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
