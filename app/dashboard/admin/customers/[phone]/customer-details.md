
  ---
  📊 Individual Customer Detail Page

  Route: /dashboard/admin/customers/[phone]

  1. Customer Profile Header

  - Avatar with initials
  - Customer Name (most recent)
  - Phone Number (primary ID)
  - WhatsApp Number (with direct link)
  - Customer Since (first order date)
  - Last Seen (last order date)
  - Status Badge (Active/Inactive)
  - Edit Customer Info button (update name, add notes)

  2. Customer Stats Cards (5 cards)

  - Total Orders - Count with trend vs previous period
  - Total Spent - Lifetime value with trend
  - Average Order Value - Calculated average
  - Conversion Rate - Delivered / Total orders %
  - Days Since Last Order - Highlighted if > 30 days

  3. Order Timeline/History

  - Full order list for this customer (not just 10)
  - Columns: Order #, Date, Items Count, Amount, Status, Source
  - Sortable and filterable
  - Click to view order details
  - Visual timeline showing order frequency

  4. Purchase Behavior Charts

  Chart 1: Orders Over Time
  - Line/bar chart showing orders by month
  - Helps identify purchase patterns

  Chart 2: Order Status Distribution
  - Pie chart: Delivered / Cancelled / Pending / etc.
  - Shows reliability as a customer

  Chart 3: Preferred Order Source
  - Bar chart: Facebook / TikTok / WhatsApp / Website
  - Shows which channel to prioritize

  Chart 4: Products Purchased
  - List of top 5 products ordered by this customer
  - Quantity and total spent per product
  - Helps with personalized recommendations

  5. Customer Insights Section

  Metrics:
  - Purchase Frequency - "Orders every X days on average"
  - Favorite Products - Top 3 most ordered items
  - Preferred Channel - Primary order source
  - Peak Order Day - Day of week they order most
  - Location - Most common delivery city/state
  - Delivery Success Rate - % of orders delivered successfully

  Flags/Badges:
  - 🌟 VIP Customer (5+ orders)
  - 🔁 Repeat Customer (2+ orders)
  - ⚠️ At Risk (60+ days inactive)
  - 🎯 High Value (₦100k+ spent)
  - 🚫 Problematic (2+ cancelled orders)


  7. Quick Actions Panel

  - Contact Customer (WhatsApp/Call)
  - Create New Order (manual order for this customer)
  - Send Follow-up (template message)
  - Add to Segment (VIP list, promo list, etc.)
  - Export Customer Data

  8. Notes Section

  - Admin can add private notes about customer
  - "Prefers delivery after 5 PM"
  - "Allergic to X product"
  - "Always negotiates price"

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
  🎯 Priority Features (MVP)

  If building in phases, start with:

  Phase 1 (Essential):
  1. Customer listing table with basic stats
  2. Search by phone/name
  3. Filter by order count and status
  4. Customer detail page with order history
  5. WhatsApp/Call quick actions

  Phase 2 (Enhanced):
  6. Stats cards with trends
  7. Period filtering
  8. Customer segmentation
  9. Export functionality

  Phase 3 (Advanced):
  10. Charts and visualizations
  11. Customer notes
  12. Purchase behavior insights
  13. Bulk actions
