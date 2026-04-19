"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ProductsSearchProps {
  currentSearch: string;
  currentSort: string;
  currentStockFilter: string;
}

const STOCK_FILTERS = [
  { value: "all", label: "All Products" },
  { value: "in-stock", label: "In Stock" },
  { value: "low-stock", label: "Low Stock" },
  { value: "out-of-stock", label: "Out of Stock" },
];

export function ProductsSearch({
  currentSearch,
  currentSort,
  currentStockFilter,
}: ProductsSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(currentSearch);
  const [showFilters, setShowFilters] = useState(false);

  const updateParams = (updates: Record<string, string | null>) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "" || value === "all") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      // Reset to page 1 when filters change
      params.delete("page");

      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ search: searchValue });
  };

  const handleSortChange = (value: string) => {
    updateParams({ sort: value });
  };

  const handleStockFilterChange = (value: string) => {
    updateParams({ stock: value });
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by product name, SKU, or keyword..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="pl-10 text-sm"
                disabled={isPending}
              />
            </div>
            <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
              Search
            </Button>
          </form>

          {/* Sort Dropdown */}
          <div className="w-full sm:w-48">
            <Select
              value={currentSort}
              onValueChange={handleSortChange}
              disabled={isPending}
            >
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name (A-Z)</SelectItem>
                <SelectItem value="price-asc">Price (Low to High)</SelectItem>
                <SelectItem value="price-desc">Price (High to Low)</SelectItem>
                <SelectItem value="stock-desc">Stock (High to Low)</SelectItem>
                <SelectItem value="stock-asc">Stock (Low to High)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filter Toggle */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            disabled={isPending}
            title="Toggle filters"
          >
            <SlidersHorizontal className="size-4" />
          </Button>
        </div>

        {/* Stock Filter Chips */}
        {showFilters && (
          <div className="flex flex-wrap gap-2 pt-2 sm:pt-3 border-t">
            {STOCK_FILTERS.map((filter) => (
              <button
                key={filter.value}
                onClick={() => handleStockFilterChange(filter.value)}
                disabled={isPending}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                  currentStockFilter === filter.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
