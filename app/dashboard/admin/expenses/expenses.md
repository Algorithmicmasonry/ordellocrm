 (/dashboard/admin/expenses):

  ---
  1. Dashboard Header & Period Filtering

  - Dashboard Header Component: With page title "Expense Management" and description
  - Period Filter: Today, This Week, This Month, This Year (like sales reps and customers pages)
  - Date Range Picker: Allow custom date range selection for advanced filtering
  - All stats and data should be filtered by the selected period

  ---
  2. Expense Statistics Cards (4-6 cards)

  - Total Expenses: Sum of all expenses in the period with trend vs previous period
  - Product-Specific Expenses: Total expenses linked to products with trend
  - General Expenses: Total expenses not linked to products (productId is null) with trend
  - Average Expense: Average expense amount in the period
  - Expense by Type Breakdown: Show top expense type (ad_spend, delivery, shipping, clearing, other)
  - Monthly Burn Rate: Average expenses per month (if period > month)

  ---
  3. Expense Management Features

  3.1 Add New Expense

  - Add Expense Modal/Form with fields:
    - Expense Type (dropdown): ad_spend, delivery, shipping, clearing, other. When other is selected, show a text input for custom type
    - Amount (number input with Naira symbol)
    - Date (date picker, defaults to today)
    - Product (optional dropdown): Link to a specific product or leave as general expense
    - Description (optional textarea): Additional notes
  - Validation: Amount must be positive, type is required, date cannot be in future
  - Toast notifications on success/failure

  3.2 Edit Expense

  - Edit Expense Modal pre-filled with existing data
  - Same fields as Add Expense
  - Show last updated timestamp
  - Confirmation before saving changes

  3.3 Delete Expense

  - Delete confirmation dialog with warning
  - Show expense details (type, amount, date) before deleting
  - Permanent deletion (no soft delete in schema)

  ---
  4. Expenses Table/List

  - Columns:
    - Date (sortable)
    - Expense Type (with badge colors: ad_spend=blue, delivery=green, shipping=purple, clearing=orange, other=gray)
    - Product Name (if linked, otherwise show "General Expense")
    - Amount (formatted with Naira symbol, sortable)
    - Description (truncated, show tooltip on hover)
    - Actions (Edit, Delete buttons)
  - Sorting: By date (default: newest first), by amount, by type
  - Pagination: 20 expenses per page
  - Search/Filter Bar:
    - Search by description
    - Filter by expense type (dropdown)
    - Filter by product (dropdown showing all products)
    - Filter by date range

  ---
  5. Expense Analytics & Charts

  5.1 Expense Trend Chart

  - Line Chart: Show daily/weekly/monthly expense trends over time
  - X-axis: Time period, Y-axis: Total expenses
  - Compare current period vs previous period (two lines)

  5.2 Expense by Type Distribution

  - Pie Chart or Bar Chart: Break down expenses by type
  - Show percentage for each type
  - Click to filter table by that type

  5.3 Product-Specific vs General Expenses

  - Donut Chart: Visualize split between product-linked and general expenses
  - Show counts and amounts for each

  5.4 Top 5 Products by Expenses

  - Bar Chart: Show which products have the most associated expenses
  - Useful for identifying high-cost products
  - Click to view all expenses for that product

  ---
  6. Bulk Operations

  - Bulk Delete: Select multiple expenses with checkboxes and delete in one action
  - Bulk Edit: Change expense type for multiple expenses at once
  - Export to CSV/Excel: Export all expenses (or filtered subset) with all details

  ---
  7. Expense Reports

  7.1 Summary Report

  - Total expenses by type for the period
  - Month-over-month comparison
  - Year-to-date total
  - Downloadable as PDF

  7.2 Product Expense Report

  - Show all products with their associated expenses
  - Calculate "Expense per Unit" (total product expenses / units sold)
  - Helps identify which products have high marketing/delivery costs

  7.3 Profit Impact Report

  - Show how expenses affect net profit
  - Display: Revenue - Cost - Expenses = Net Profit
  - Show profit margin percentage

  ---
  8. Quick Actions Panel

  - Add Expense Button: Quick access at top of page
  - Import Expenses: Upload CSV to bulk import expenses
  - Refresh Data: Refresh button to reload expenses
  - Filter Presets: Quick filters like "This Month's Ad Spend", "Today's Delivery Costs", etc.

  ---
  9. Expense Insights & Alerts

  9.1 Expense Alerts
  
  - Highlight unusual spikes in specific expense types
  - Alert when general expenses are much higher than product-specific

  9.2 Expense Trends Insights

  - "Your ad spend is up 30% this month compared to last month"
  - "Delivery costs have decreased by 15%"
  - "Clearing expenses are your highest cost this quarter"

  ---
  10. Integration with Other Modules

  10.1 Product Detail Page Integration

  - Link from expense table to product detail page (if product-linked)
  - Show "View All Expenses" button on product page

  10.2 Dashboard Integration

  - Main admin dashboard should show total expenses in the stats
  - Net profit calculation should include expenses: Revenue - Cost - Expenses

  10.3 Financial Reports

  - Expenses should feed into profit/loss statements
  - Break down expenses by category for financial reporting

  ---
  11. Responsive Design & UX

  - Mobile-Friendly: Table should scroll horizontally or stack on small screens
  - Touch-Friendly: Action buttons large enough for touch
  - Loading States: Skeletons while data loads
  - Empty States: Friendly message when no expenses exist ("No expenses yet. Add your first expense!")

  ---
  12. Authorization & Permissions

  - ADMIN-only access: Only admins can create, edit, or delete expenses
  - Show unauthorized message for non-admin users
  - Sales reps and inventory managers should not see this route

  
  Feature Priority (MVP vs Enhanced)

  Phase 1 (MVP - Essential):

  1. Dashboard header with period filter
  2. Stats cards (total, by type, product-specific vs general)
  3. Add/Edit/Delete expense functionality
  4. Expenses table with sorting, pagination, search
  5. Expense by type distribution chart
  6. Export to CSV

  Phase 2 (Enhanced):

  7. Expense trend chart over time
  8. Top products by expenses
  9. Bulk operations
  10. Product-specific expense filtering
  11. Expense reports

  Phase 3 (Advanced):

  12. Recurring expenses
  13. Budget management
  14. Expense approvals
  15. Attachments/receipts

  ---
  This expense route would provide comprehensive expense tracking and integrate seamlessly with the profit calculations across the dashboard, giving admins full visibility into
  where money is being spent and how it impacts profitability.
