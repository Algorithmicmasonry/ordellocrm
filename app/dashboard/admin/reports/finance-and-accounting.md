
  Core Financial Reports (Priority 1 - MVP)

  1. Profit & Loss Statement (P&L)

  - Revenue: Total from delivered orders (grouped by period)
  - COGS: Cost of goods sold (from order items)
  - Operating Expenses: All expenses from the expense tracker
  - Gross Profit: Revenue - COGS
  - Net Profit: Gross Profit - Operating Expenses
  - Period Comparison: Current vs previous period with trends

  2. Comprehensive Financial Dashboard

  Key metrics:
  - Gross Margin: (Revenue - COGS) / Revenue × 100
  - Operating Margin: (Gross Profit - Expenses) / Revenue × 100
  - Net Profit Margin: Net Profit / Revenue × 100
  - Burn Rate: Average daily/monthly expenses
  - Revenue Growth Rate: Period-over-period comparison
  - Break-even Analysis: When revenue = total costs

  3. Product Profitability Analysis

  For each product:
  - Total revenue generated
  - Total COGS
  - Product-specific expenses
  - Net profit per product
  - Profit margin percentage
  - Units sold vs revenue contribution
  - ROI per product
  - Return on Ad Spend (ROAS)

  4. Cash Flow Overview

  - Cash In:
    - Delivered orders (actual revenue)
    - Expected revenue from pending orders
  - Cash Out:
    - Operating expenses by category
    - COGS for delivered orders
    - Agent delivery costs
  - Net Cash Flow: In - Out
  - Monthly cash flow trend

  5. Expense Analysis Dashboard

  - Total expenses by category (ad spend, delivery, shipping, clearing, other)
  - Expense trends over time
  - Product-linked vs general expenses
  - Top expense categories
 


  6. Sales Rep Financial Performance

  - Revenue generated per rep
  - Cost per acquisition (CPA) per rep
  - ROI on sales team
  - Performance tracking

  7. Agent Cost Analysis

  - Delivery costs per agent
  - Agent stock value (current inventory assigned)
  - Defective/missing stock losses
  - Agent profitability comparison
  - Cost per delivery by agent



  ---
  Reporting & Export Features

  11. Custom Reports

  - Date range selector (today, week, month, quarter, year, custom)
  - Downloadable formats:
    - PDF: Professional formatted reports
    - Excel: Detailed spreadsheets with formulas
    - CSV: Raw data exports

  12. Financial Visualizations

  - Revenue vs Expenses over time (line/area charts)
  - Expense breakdown by category (pie/donut charts)
  - Product profitability comparison (bar charts)
  - Monthly cash flow waterfall chart
  - Margin trends (line charts)
  - Budget vs actual (stacked bar charts)

  ---
  Suggested Route Structure

  /dashboard/admin/finance
  ├── /                          # Main financial dashboard (KPIs, summary)
  ├── /profit-loss              # Detailed P&L statement
  ├── /cash-flow                # Cash flow analysis
  ├── /product-profitability    # Product-level financial analysis
  ├── /expenses                 # Link to existing expenses route
  ├── /sales-rep-performance    # Financial view of sales rep performance
  ├── /agent-costs              # Agent delivery cost tracking
  ├── /budgets                  # Budget management (future)
  ├── /tax-reports              # Tax calculations (future)
  └── /forecasting              # Financial projections (future)

  ---
  Key Data Sources Already Available

  From your existing Prisma schema:
  - ✅ Orders: Revenue, COGS (from OrderItems with price/cost)
  - ✅ Expenses: Operating expenses with type categorization
  - ✅ Products: Cost/price, inventory tracking
  - ✅ Agents: Stock assignments, delivery tracking
  - ✅ Sales Reps: Order assignments for performance tracking
  - ✅ OrderItems: Item-level price/cost for accurate COGS

 This route will make use of the shadcnUi tabs component to seperate the reports in tabs
