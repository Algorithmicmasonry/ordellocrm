Perfect! Based on your current database schema where customers are stored as order fields (not a separate table), here's what the Customers Route should have:

  ---
  📋 Customers Route - Feature Specification

  Route Structure

  - /dashboard/admin/customers - Main customers listing page
  - /dashboard/admin/customers/[phone] - Individual customer detail page (using phone as unique identifier)

  ---
  🎯 Main Customers Page Features

  1. Customer Listing Table

  Display aggregated customer data from orders:

  Columns:
  - Customer Name
  - Phone Number
  - WhatsApp Number (if different)
  - Total Orders
  - First Order Date
  - Last Order Date
  - Total Spent (Lifetime Value)
  - Average Order Value
  - Status (Active/Inactive - based on recent activity)
  - Preferred Source (Facebook/TikTok/WhatsApp/Website)
  - Actions (View Details, Contact)

  Customer Aggregation Logic:
  - Group orders by customerPhone (unique identifier)
  - Handle name variations (same phone, different name spellings)
  - Show most recent name used

  2. Stats Cards (Top of Page)

  - Total Customers - Unique phone numbers with trend
  - Active Customers - Ordered in last 30 days with trend
  - Average Lifetime Value - Total spent ÷ customer count
  - Repeat Customer Rate - Customers with 2+ orders percentage

  3. Search & Filtering

  Search by:
  - Customer Name (fuzzy search)
  - Phone Number (exact/partial match)
  - WhatsApp Number

  Filters:
  - Activity Status: All / Active (ordered in last 30 days) / Inactive (30+ days)
  - Order Count: All / First-time buyers / Repeat customers (2+) / VIP (5+)
  - Lifetime Value Range: All / Under ₦10k / ₦10k-50k / ₦50k-100k / ₦100k+
  - Order Source: All / Facebook / TikTok / WhatsApp / Website
  - Location: Filter by City or State

  Period Filter:
  - Today / Week / Month / Year (affects stats and calculations)

  4. Sorting

  - Name (A-Z, Z-A)
  - Total Orders (High to Low, Low to High)
  - Total Spent (High to Low, Low to High)
  - Last Order Date (Recent to Old, Old to Recent)
  - First Order Date (Recent to Old, Old to Recent)

  5. Customer Segmentation Cards

  Visual segments before the main table:

  - VIP Customers (5+ orders or ₦100k+ spent) - Count + Total LTV
  - Repeat Customers (2-4 orders) - Count + Total LTV
  - One-Time Buyers (1 order) - Count + Potential revenue
  - At-Risk Customers (No order in 60+ days) - Count + Last active

  6. Quick Actions

  For each customer row:
  - View Details - Navigate to customer detail page
  - WhatsApp Button - Opens WhatsApp chat with pre-filled message
  - Call Button - tel: link for direct calling
  - View Orders - Filter orders page by this customer


  8. Export

  - Export customer list as CSV/Excel
  - Includes: Name, Phone, Orders, Total Spent, Last Order, etc.

  ---
  🎨 UI/UX Considerations

  Design Consistency

  - Follow same pattern as Sales Reps page
  - Use existing components (DashboardHeader, PeriodFilter, etc.)
  - Same color scheme and card layouts

  Responsiveness

  - Mobile-friendly table (stack on small screens)
  - Touch-friendly action buttons
  - Collapsible filters on mobile

  Performance

  - Pagination (20-50 customers per page)
  - Lazy loading for large datasets
  - Efficient customer aggregation queries

  ---
  🔧 Technical Implementation Notes

  Data Aggregation Strategy

  Since customers aren't a separate table:

  1. Query all orders
  2. Group by customerPhone
  3. Aggregate:
     - Count orders
     - Sum totalAmount
     - Get min(createdAt) as firstOrder
     - Get max(createdAt) as lastOrder
     - Get most recent customerName
     - Calculate stats
  4. Apply filters and pagination
  5. Return enriched customer objects

  Server Actions Needed

  - getCustomers(filters, period, page) - List with pagination
  - getCustomerDetails(phone, period) - Individual customer data
  - updateCustomerInfo(phone, data) - Update name or add notes
  - exportCustomers(filters) - Generate CSV

  Caching Strategy

  - Customer list: Cache for 5 minutes
  - Individual customer: Cache for 2 minutes
  - Use revalidatePath() after order changes

  ---
