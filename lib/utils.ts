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
    ADMIN: "System Admin",
    SALES_REP: "Sales Representative",
    INVENTORY_MANAGER: "Inventory Manager",
  };
  
  return roleMap[role] || role;
}