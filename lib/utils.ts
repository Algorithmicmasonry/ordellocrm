import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


// ... existing code ...

export function getInitials(name: string): string {
  if (!name) return "??";
  
  const parts = name.trim().split(" ");
  
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formatRole(role: string): string {
  const roleMap: Record<string, string> = {
    OWNER: "Owner",
    ADMIN: "Admin",
    SALES_REP: "Sales Representative",
    INVENTORY_MANAGER: "Inventory Manager",
  };

  return roleMap[role] || role;
}

/**
 * Converts a business name to a URL-safe slug.
 * "Kolor Naturals Limited" → "kolor-naturals-limited"
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")  // remove special chars
    .replace(/\s+/g, "-")           // spaces → hyphens
    .replace(/-+/g, "-")            // collapse multiple hyphens
    .replace(/^-|-$/g, "")          // trim leading/trailing hyphens
}