import type { Currency } from "@prisma/client";

export interface CurrencyConfig {
  code: Currency;
  symbol: string;
  name: string;
  locale: string; // For number formatting
}

export const CURRENCIES: Record<Currency, CurrencyConfig> = {
  NGN: {
    code: "NGN",
    symbol: "₦",
    name: "Nigerian Naira",
    locale: "en-NG",
  },
  GHS: {
    code: "GHS",
    symbol: "GH₵",
    name: "Ghanaian Cedi",
    locale: "en-GH",
  },
  USD: {
    code: "USD",
    symbol: "$",
    name: "US Dollar",
    locale: "en-US",
  },
  GBP: {
    code: "GBP",
    symbol: "£",
    name: "British Pound",
    locale: "en-GB",
  },
  EUR: {
    code: "EUR",
    symbol: "€",
    name: "Euro",
    locale: "en-EU",
  },
};

/**
 * Format amount with currency symbol
 * @param amount - The amount to format
 * @param currency - The currency code
 * @param includeSymbol - Whether to include currency symbol (default: true)
 */
export function formatCurrency(
  amount: number,
  currency: Currency = "NGN",
  includeSymbol: boolean = true,
): string {
  const config = CURRENCIES[currency];
  const formatted = amount.toLocaleString(config.locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return includeSymbol ? `${config.symbol}${formatted}` : formatted;
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: Currency): string {
  return CURRENCIES[currency].symbol;
}

/**
 * Get currency name
 */
export function getCurrencyName(currency: Currency): string {
  return CURRENCIES[currency].name;
}

/**
 * Get all available currencies
 */
export function getAvailableCurrencies(): CurrencyConfig[] {
  return Object.values(CURRENCIES);
}

/**
 * Validate currency code
 */
export function isValidCurrency(code: string): code is Currency {
  return code in CURRENCIES;
}

/**
 * Get currency from string (with fallback)
 */
export function parseCurrency(code: string | undefined): Currency {
  if (!code) return "NGN";
  const upperCode = code.toUpperCase();
  return isValidCurrency(upperCode) ? upperCode : "NGN";
}
