

● Based on the database schema and project architecture, here's what the Sales Rep Dashboard should include:

  Core Functionalities

  1. Order Management (Primary Focus)

  Sales reps should only see orders where assignedToId matches their user ID.

  Key Features:
  - Order List Table with columns:
    - Order number
    - Customer name & phone
    - Total amount
    - Status (NEW/CONFIRMED/DISPATCHED/DELIVERED/CANCELLED/POSTPONED)
    - Source (Facebook/TikTok/WhatsApp/Website)
    - Created date
    - Actions (View, Update Status, Add Note)
  - Status Management: Quick actions to move orders through workflow:
    - NEW → CONFIRMED → DISPATCHED → DELIVERED
    - Ability to mark as CANCELLED or POSTPONED
  - Order Details Modal/Page:
    - Full customer info (name, phone, WhatsApp, delivery address, state, city)
    - Order items breakdown (product, quantity, price)
    - Communication notes timeline
    - Status history with timestamps
    - Agent assignment for delivery

  2. Statistics Cards

  - Total Orders: Count of all assigned orders
  - Orders by Status: NEW (pending action), CONFIRMED (ready), DISPATCHED (in transit)
  - Today's Orders: Orders created today
  - Delivered This Week: Successfully completed orders
  - Conversion Rate: (Delivered orders / Total orders) × 100

  3. Communication Tracking

  - Add Notes: Quick note-taking for customer calls/interactions
  - Follow-up System:
    - Mark notes with isFollowUp: true and followUpDate
    - Dashboard section showing orders with pending follow-ups today/this week
    - Notifications for overdue follow-ups

  4. Agent Assignment

  - View active agents from Agent model
  - Assign agents to orders for fulfillment
  - Filter agents by location to match customer delivery address

  5. Filters & Search

  - Status Filter: All, NEW, CONFIRMED, DISPATCHED, DELIVERED, CANCELLED, POSTPONED
  - Date Range: Today, This Week, This Month, Custom
  - Source Filter: Facebook, TikTok, WhatsApp, Website
  - Search: Customer name, phone, order number

  6. Product Catalog View

  - Read-only access to active products
  - See product name, price, current stock availability
  - Used when manually creating orders or answering customer inquiries

  What Sales Reps CANNOT Access

  - Other sales reps' orders
  - Inventory management (add/update stock)
  - Product management (create/edit/delete products)
  - Expense tracking
  - Cost data or profit margins (only see selling prices)
  - Financial analytics beyond their own revenue
  - Admin functions (user management, agent creation)

  Suggested Layout Structure

  SalesRepDashboard
  ├── DashboardHeader (search, notifications, profile)
  ├── Stats Cards Row (4-5 KPI cards)
  ├── Follow-up Reminders Section (if any pending)
  ├── Filters Row (status, date range, source, search)
  └── Orders Table
      ├── Order rows with quick actions
      └── Pagination

  OrderDetailsModal
  ├── Customer Information
  ├── Order Items Table
  ├── Status Update Actions
  ├── Agent Assignment Dropdown
  └── Communication Notes Timeline
      └── Add Note Form (with follow-up checkbox)

  Key Behavioral Rules

  - All database queries MUST filter by assignedToId = userId
  - Only show delivered orders' revenue in stats (not cancelled/postponed)
  - Timestamp tracking for status changes (confirmedAt, dispatchedAt, deliveredAt)
  - Inventory deduction only happens when order reaches DELIVERED status
  - Cannot manually assign orders to themselves (handled by round-robin system)

  This dashboard focuses on order fulfillment and customer relationship management - the sales rep's primary job is to move orders from NEW → DELIVERED while maintaining
  communication records.
