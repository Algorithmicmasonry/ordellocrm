"use client";
import type { ProductPackage, Currency } from "@prisma/client";
import { getCurrencySymbol } from "@/lib/currency";

interface PackageSelectorProps {
  packages: ProductPackage[];
  selectedPackageId: string;
  onSelect: (packageId: string) => void;
  currency?: Currency;
  packageSelectorNote?: string;
}

export function PackageSelector({
  packages,
  selectedPackageId,
  onSelect,
  currency = "NGN",
  packageSelectorNote,
}: PackageSelectorProps) {
  // Filter packages by selected currency
  const filteredPackages = packages.filter((pkg) => pkg.currency === currency);
  const currencySymbol = getCurrencySymbol(currency);

  if (filteredPackages.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 light">
      <h3 className="text-sm font-bold text-gray-900 mb-4 tracking-wide">
        SELECT YOUR PACKAGE *
      </h3>
      {packageSelectorNote && (
        <p className="text-md text-gray-900 mb-4">{packageSelectorNote}</p>
      )}
      <div className="border-b border-gray-300 mb-4">
        <div className="flex justify-between items-center pb-2 px-2">
          <span className="text-sm font-bold text-gray-900">Product</span>
          <span className="text-sm font-bold text-gray-900">Price</span>
        </div>
      </div>
      <div className="space-y-3">
        {filteredPackages.map((pkg) => (
          <div key={pkg.id} className="flex items-center gap-3 px-2 py-1">
            <input
              type="radio"
              id={pkg.id}
              name="package"
              value={pkg.id}
              checked={selectedPackageId === pkg.id}
              onChange={(e) => onSelect(e.target.value)}
              className="w-4 h-4 cursor-pointer accent-blue-600"
            />
            <label
              htmlFor={pkg.id}
              className="flex-1 text-sm font-bold text-gray-900 cursor-pointer"
            >
              {pkg.description || pkg.name}
            </label>
            <span className="text-sm font-bold text-gray-900">
              {currencySymbol}
              {pkg.price.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
