"use client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getAvailableCurrencies } from "@/lib/currency";
import type { Currency } from "@prisma/client";
import { ChevronDown, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useTransition } from "react";

export function CurrencyFilter() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const currentCurrency = (searchParams.get("currency") as Currency) || "NGN"; // Default to NGN

  const handleCurrencyChange = (currency: Currency) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("currency", currency);
      router.push(`?${params.toString()}`);
    });
  };

  const currencies = getAvailableCurrencies();

  const selectedCurrency =
    currencies.find((c) => c.code === currentCurrency) || currencies[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              {selectedCurrency.symbol} {selectedCurrency.name}
              <ChevronDown className="ml-2 size-4" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {currencies.map((currency) => (
          <DropdownMenuItem
            key={currency.code}
            onSelect={() => handleCurrencyChange(currency.code as Currency)}
          >
            {currency.symbol} - {currency.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
