"use client";

import { createOrderV2 } from "@/app/actions/orders";
import { PackageSelector } from "@/app/order-form/_components/package-selector";
import { GHANA_REGIONS } from "@/lib/ghana-regions";
import { NIGERIA_STATES } from "@/lib/nigeria-states";
import type { Currency, ProductWithPackages } from "@/lib/types";
import { useRef, useState, useMemo } from "react";
import React from "react";

interface SandboxOrderFormClientProps {
  product: ProductWithPackages;
  currency: Currency;
  organizationId: string;
}

export function SandboxOrderFormClient({
  product,
  currency,
  organizationId,
}: SandboxOrderFormClientProps) {
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const submittingRef = useRef(false);

  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    customerWhatsapp: "",
    deliveryAddress: "",
    state: "",
    city: "",
  });

  const stateLabel = currency === "GHS" ? "Region" : "State";

  const countryCode = useMemo(() => {
    switch (currency) {
      case "GHS":
        return "+233";
      case "NGN":
        return "+234";
      default:
        return "+234";
    }
  }, [currency]);

  function handlePackageSelect(packageId: string) {
    setSelectedPackageId(packageId);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (submittingRef.current) return;
    submittingRef.current = true;

    setLoading(true);
    setError("");
    setSuccess(false);

    if (!selectedPackageId) {
      setError("Please select a package");
      setLoading(false);
      submittingRef.current = false;
      return;
    }

    const normalizePhone = (raw: string) => countryCode + raw.replace(/^0/, "");

    try {
      const result = await createOrderV2({
        organizationId,
        customerName: formData.customerName,
        customerPhone: normalizePhone(formData.customerPhone),
        customerWhatsapp: formData.customerWhatsapp
          ? normalizePhone(formData.customerWhatsapp)
          : undefined,
        deliveryAddress: formData.deliveryAddress,
        state: formData.state,
        city: formData.city,
        productId: product.id,
        selectedPackages: [selectedPackageId],
        currency,
        isSandbox: true,
      });

      if (result.success) {
        setSuccess(true);
        setFormData({
          customerName: "",
          customerPhone: "",
          customerWhatsapp: "",
          deliveryAddress: "",
          state: "",
          city: "",
        });
        setSelectedPackageId("");
      } else {
        setError(result.error || "Failed to submit order. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  }

  return (
    <div className="w-full p-4 md:p-8 bg-white" style={{ colorScheme: "light" }}>
      <div className="max-w-md mx-auto">
        {/* Sandbox banner */}
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-400 rounded-md flex items-center gap-2">
          <span className="text-yellow-700 font-bold text-sm">⚠ SANDBOX</span>
          <span className="text-yellow-700 text-sm">
            This is a test order — it will not affect real inventory or revenue.
          </span>
        </div>

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-800 text-sm font-medium">
              ✓ Sandbox order submitted! The AI agent should call this number shortly.
            </p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Your Name *"
            required
            value={formData.customerName}
            onChange={(e) =>
              setFormData({ ...formData, customerName: e.target.value })
            }
            className="w-full px-4 py-2.5 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-600"
          />

          <div className="flex gap-2">
            <div className="px-3 py-2.5 border border-gray-400 rounded-lg bg-gray-100 text-gray-900 flex items-center font-medium">
              {countryCode}
            </div>
            <input
              type="tel"
              placeholder="Your Phone Number *"
              required
              value={formData.customerPhone}
              onChange={(e) =>
                setFormData({ ...formData, customerPhone: e.target.value })
              }
              className="flex-1 px-4 py-2.5 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-600"
            />
          </div>

          <div className="flex gap-2">
            <div className="px-3 py-2.5 border border-gray-400 rounded-lg bg-gray-100 text-gray-900 flex items-center font-medium">
              {countryCode}
            </div>
            <input
              type="tel"
              placeholder="Your WhatsApp Number *"
              required
              value={formData.customerWhatsapp}
              onChange={(e) =>
                setFormData({ ...formData, customerWhatsapp: e.target.value })
              }
              className="flex-1 px-4 py-2.5 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-600"
            />
          </div>

          <input
            type="text"
            placeholder="Your Address *"
            required
            value={formData.deliveryAddress}
            onChange={(e) =>
              setFormData({ ...formData, deliveryAddress: e.target.value })
            }
            className="w-full px-4 py-2.5 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-600"
          />

          <input
            type="text"
            placeholder="Your City *"
            required
            value={formData.city}
            onChange={(e) =>
              setFormData({ ...formData, city: e.target.value })
            }
            className="w-full px-4 py-2.5 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-600"
          />

          <input
            type="text"
            placeholder={`Your ${stateLabel} *`}
            required
            value={formData.state}
            onChange={(e) =>
              setFormData({ ...formData, state: e.target.value })
            }
            className="w-full px-4 py-2.5 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-600"
          />

          <div className="mt-6">
            <PackageSelector
              packages={product.packages}
              selectedPackageId={selectedPackageId}
              onSelect={handlePackageSelect}
              currency={currency}
              packageSelectorNote={product.packageSelectorNote ?? ""}
            />
          </div>

          <div className="flex items-center gap-3 mt-6 px-2">
            <input
              type="radio"
              id="pod"
              name="payment"
              defaultChecked
              className="w-4 h-4 text-green-600 cursor-pointer"
            />
            <label htmlFor="pod" className="flex items-center gap-2 cursor-pointer">
              <div className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                <span>💳</span>
                <span>Pay On Delivery</span>
              </div>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-500 text-white py-2.5 px-4 rounded-lg text-base font-bold hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors cursor-pointer mt-6"
          >
            {loading ? "SUBMITTING..." : "ORDER NOW (SANDBOX)"}
          </button>
        </form>
      </div>
    </div>
  );
}
