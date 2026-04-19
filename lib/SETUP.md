# Ordo CRM - Setup Guide

This guide will help you set up and run the Ordo E-commerce CRM system.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (or NeonDB account)
- pnpm package manager

### Install pnpm (if not already installed)

```bash
npm install -g pnpm
```

Or using other methods:
```bash
# Using Homebrew (macOS)
brew install pnpm

# Using standalone script
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

## Initial Setup

### 1. Install Dependencies

```bash
pnpm install
```

Note: pnpm handles peer dependencies more gracefully than npm, so no special flags are needed.

### 2. Configure Environment Variables

Edit the `.env` file with your actual database connection:

```env
# Database (Required)
DATABASE_URL="postgresql://username:password@host:5432/ordo?schema=public"

# Better Auth (Required)
BETTER_AUTH_SECRET="your-secret-key-here"
BETTER_AUTH_URL="http://localhost:3000"

# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**For NeonDB:**
1. Create a free account at https://neon.tech
2. Create a new project
3. Copy the connection string and paste it as your `DATABASE_URL`

### 3. Initialize Database

Run Prisma migrations to create all tables:

```bash
pnpm prisma migrate dev --name init
```

This will:
- Create all database tables
- Generate the Prisma Client

### 4. Seed Initial Data (Optional but Recommended)

Create an admin user and sample data:

```bash
pnpm prisma db seed
```

Or if using a custom seed script:
```bash
pnpm exec ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts
```

This creates:
- Admin user: `admin@ordo.com` / `admin123`
- Sales rep user: `sales@ordo.com` / `sales123`
- Sample products

### 5. Run Development Server

```bash
pnpm dev
```

Visit http://localhost:3000

## System Access

### Admin Dashboard
- URL: http://localhost:3000/admin
- Login with admin credentials

### Sales Rep Dashboard
- URL: http://localhost:3000/dashboard
- Login with sales rep credentials

### Embeddable Order Form
- URL: http://localhost:3000/order-form
- Embed in your website using iframe:

```html
<iframe
  src="http://localhost:3000/order-form"
  width="100%"
  height="800px"
  frameborder="0"
></iframe>
```

## Production Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. In Vercel build settings, set:
   - **Install Command:** `pnpm install`
   - **Build Command:** `pnpm build`
5. Deploy

### Database Setup

1. Use NeonDB for production PostgreSQL
2. Update `DATABASE_URL` in Vercel environment variables
3. Run migrations: `pnpm prisma migrate deploy`

## Key Features

### Admin Dashboard
- Complete system oversight
- Manage products, inventory, agents
- View all orders and revenue
- Track profit and expenses
- Manage sales representatives

### Sales Rep Dashboard
- View assigned orders only
- Update order status
- Add notes and follow-ups
- Assign orders to agents
- Click-to-call and WhatsApp integration
- View performance metrics

### Order Management
- Round-robin automatic assignment
- Status tracking: New → Confirmed → Dispatched → Delivered
- Revenue counted on Delivered orders only
- Automatic inventory deduction on delivery

### Inventory Management
- Global stock tracking
- Per-agent stock allocation
- Track defective and missing items
- Automatic deduction on delivery

### Financial Tracking
- Revenue calculation (delivered orders only)
- Profit calculation (revenue - cost - expenses)
- Track ad spend, delivery, shipping costs
- Per-product and per-period reports

## Common Issues

### Issue: "Module not found" errors
**Solution:** Run `pnpm install` again or try `pnpm install --force`

### Issue: Database connection error
**Solution:** Verify your `DATABASE_URL` is correct and database is accessible

### Issue: Auth not working
**Solution:** Make sure `BETTER_AUTH_SECRET` is set and `pnpm prisma migrate dev` has been run

### Issue: pnpm command not found
**Solution:** Install pnpm globally with `npm install -g pnpm` or use `npx pnpm`

## Useful pnpm Commands

```bash
# Install dependencies
pnpm install

# Add a new package
pnpm add <package-name>

# Add dev dependency
pnpm add -D <package-name>

# Remove a package
pnpm remove <package-name>

# Update dependencies
pnpm update

# Run scripts
pnpm dev
pnpm build
pnpm start

# Clean cache
pnpm store prune
```

## Support

For issues or questions, refer to the main requirements document or contact the development team.

## Security Notes

- Change default admin password immediately
- Use strong passwords in production
- Keep `BETTER_AUTH_SECRET` secure
- Use HTTPS in production
- Regularly backup your database

## Next Steps

1. Create your first product
2. Add sales representatives
3. Add agents for fulfillment
4. Embed the order form on your website
5. Start receiving and managing orders