/**
 * Shared expense attribution utilities.
 *
 * Batch costs (clearing, waybill) are amortized: only the portion covering
 * units actually sold in a given period is charged as an expense.
 * All other expense types are charged at their full recorded amount.
 */

export type AttributableExpense = {
  type: string;
  amount: number;
  batchQuantity: number | null;
  productId: string | null;
};

const BATCH_TYPES = new Set(["clearing", "waybill"]);

/**
 * Returns the attributed expense amount for a single expense given how many
 * units of its product were sold in the period.
 */
export function attributeExpense(
  expense: AttributableExpense,
  unitsSoldByProduct: Map<string, number>
): number {
  if (
    BATCH_TYPES.has(expense.type) &&
    expense.batchQuantity &&
    expense.batchQuantity > 0 &&
    expense.productId
  ) {
    const unitsSold = unitsSoldByProduct.get(expense.productId) ?? 0;
    return (expense.amount / expense.batchQuantity) * unitsSold;
  }
  return expense.amount;
}

/**
 * Sums attributed expense amounts for an array of expenses.
 *
 * For clearing/waybill expenses with batchQuantity:
 *   attributed = (amount / batchQuantity) × unitsSoldInPeriod
 * For all other types:
 *   attributed = full amount
 *
 * @param expenses        - Expenses to sum
 * @param unitsSoldByProduct - Map of productId → units sold in the period
 */
export function sumAttributedExpenses(
  expenses: AttributableExpense[],
  unitsSoldByProduct: Map<string, number>
): number {
  return expenses.reduce(
    (total, exp) => total + attributeExpense(exp, unitsSoldByProduct),
    0
  );
}

/**
 * Builds a productId → unitsSold map from an array of order items.
 */
export function buildUnitsSoldMap(
  items: Array<{ productId: string; quantity: number }>
): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of items) {
    map.set(item.productId, (map.get(item.productId) ?? 0) + item.quantity);
  }
  return map;
}
