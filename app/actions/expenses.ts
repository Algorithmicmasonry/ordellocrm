"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

/**
 * Get batches for a product (for batch selector in expense modal)
 */
export async function getProductBatches(productId: string) {
  try {
    const batches = await db.productBatch.findMany({
      where: { productId },
      orderBy: { date: "desc" },
      select: { id: true, name: true, quantity: true, date: true },
    })
    return { success: true, batches }
  } catch (error) {
    console.error("Error fetching batches:", error)
    return { success: false, batches: [] }
  }
}

/**
 * Create a new product batch
 */
export async function createProductBatch(data: {
  productId: string
  name: string
  quantity: number
  date?: Date
}) {
  try {
    const batch = await db.productBatch.create({
      data: {
        productId: data.productId,
        name: data.name,
        quantity: data.quantity,
        date: data.date || new Date(),
      },
    })
    return { success: true, batch }
  } catch (error) {
    console.error("Error creating batch:", error)
    return { success: false, error: "Failed to create batch" }
  }
}

/**
 * Create a new expense (Admin only)
 */
export async function createExpense(data: {
  productId?: string
  type: string
  amount: number
  batchId?: string
  batchQuantity?: number
  currency?: import("@prisma/client").Currency
  description?: string
  date?: Date
}) {
  try {
    const expense = await db.expense.create({
      data: {
        ...data,
        currency: data.currency || "NGN",
        date: data.date || new Date(),
      },
    })

    revalidatePath("/admin/expenses")
    revalidatePath("/admin")

    return { success: true, expense }
  } catch (error) {
    console.error("Error creating expense:", error)
    return { success: false, error: "Failed to create expense" }
  }
}

/**
 * Update expense (Admin only)
 */
export async function updateExpense(
  expenseId: string,
  data: {
    productId?: string
    type?: string
    amount?: number
    batchQuantity?: number | null
    currency?: import("@prisma/client").Currency
    description?: string
    date?: Date
  }
) {
  try {
    const expense = await db.expense.update({
      where: { id: expenseId },
      data,
    })

    revalidatePath("/admin/expenses")
    revalidatePath("/admin")

    return { success: true, expense }
  } catch (error) {
    console.error("Error updating expense:", error)
    return { success: false, error: "Failed to update expense" }
  }
}

/**
 * Delete expense (Admin only)
 */
export async function deleteExpense(expenseId: string) {
  try {
    await db.expense.delete({
      where: { id: expenseId },
    })

    revalidatePath("/admin/expenses")
    revalidatePath("/admin")

    return { success: true }
  } catch (error) {
    console.error("Error deleting expense:", error)
    return { success: false, error: "Failed to delete expense" }
  }
}

/**
 * Get all expenses
 */
export async function getAllExpenses() {
  try {
    const expenses = await db.expense.findMany({
      include: {
        product: true,
      },
      orderBy: {
        date: "desc",
      },
    })

    return { success: true, expenses }
  } catch (error) {
    console.error("Error fetching expenses:", error)
    return { success: false, error: "Failed to fetch expenses" }
  }
}

/**
 * Get expenses by date range
 */
export async function getExpensesByDateRange(startDate: Date, endDate: Date) {
  try {
    const expenses = await db.expense.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        product: true,
      },
      orderBy: {
        date: "desc",
      },
    })

    const total = expenses.reduce((sum, expense) => sum + expense.amount, 0)

    return { success: true, expenses, total }
  } catch (error) {
    console.error("Error fetching expenses:", error)
    return { success: false, error: "Failed to fetch expenses" }
  }
}
