-- Add new sales follow-up statuses for contact attempts
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'NOT_REACHABLE';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'NOT_PICKING_CALLS';
