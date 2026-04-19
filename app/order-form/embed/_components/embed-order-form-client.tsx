"use client";

import { createOrderV2 } from "@/app/actions/orders";
import { PackageSelector } from "@/app/order-form/_components/package-selector";
import { GHANA_REGIONS } from "@/lib/ghana-regions";
import { NIGERIA_STATES } from "@/lib/nigeria-states";
import type { Currency, ProductWithPackages } from "@/lib/types";
import type { UTMParams } from "@/lib/utm-parser";
import { extractReferrerDomain, parseUTMParams } from "@/lib/utm-parser";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";

interface EmbedOrderFormClientProps {
  product: ProductWithPackages;
  currency: Currency;
}

export function EmbedOrderFormClient({
  product,
  currency,
}: EmbedOrderFormClientProps) {
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const submittingRef = useRef(false);
  const [utmParams, setUtmParams] = useState<UTMParams | undefined>();
  const [referrer, setReferrer] = useState<string | undefined>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const redirectUrl = searchParams.get("redirectUrl");

  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    customerWhatsapp: "",
    deliveryAddress: "",
    state: "",
    city: "",
  });

  // Get appropriate states/regions based on currency
  const stateOptions = useMemo(() => {
    return currency === "GHS" ? GHANA_REGIONS : NIGERIA_STATES;
  }, [currency]);

  const stateLabel = currency === "GHS" ? "Region" : "State";

  // Get country code based on currency
  const countryCode = useMemo(() => {
    switch (currency) {
      case "GHS":
        return "+233"; // Ghana
      case "NGN":
        return "+234"; // Nigeria
      case "USD":
      case "GBP":
      case "EUR":
      default:
        return "+234"; // Default to Nigeria
    }
  }, [currency]);

  // Capture UTM params and referrer on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = parseUTMParams(window.location.href);
      const ref = extractReferrerDomain();

      if (params.source || ref) {
        Promise.resolve().then(() => {
          if (params.source) setUtmParams(params);
          if (ref) setReferrer(ref);
        });
      }
    }
  }, []);

  // Report document height to parent window for iframe auto-resizing
  useEffect(() => {
    const reportHeight = () => {
      const height = document.documentElement.scrollHeight;
      window.parent?.postMessage({ type: "ordo-resize", height }, "*");
    };

    // Report immediately, then again after a tick to catch async renders
    reportHeight();
    const t1 = setTimeout(reportHeight, 100);
    const t2 = setTimeout(reportHeight, 500);

    // Watch for size changes on the document element itself
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(reportHeight);
    });
    resizeObserver.observe(document.documentElement);

    // Watch for DOM mutations (validation messages, package expansion, etc.)
    const mutationObserver = new MutationObserver(() => {
      requestAnimationFrame(reportHeight);
    });
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  function handlePackageSelect(packageId: string) {
    setSelectedPackageId(packageId);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Prevent double-submit (race between fast clicks and React state update)
    if (submittingRef.current) return;
    submittingRef.current = true;

    setLoading(true);
    setError("");

    if (!selectedPackageId) {
      setError("Please select a package");
      setLoading(false);
      submittingRef.current = false;
      return;
    }

    // Strip leading zero before prepending country code (e.g. "0812..." → "+234812...")
    const normalizePhone = (raw: string) => countryCode + raw.replace(/^0/, "")

    try {
      const result = await createOrderV2({
        customerName: formData.customerName,
        customerPhone: normalizePhone(formData.customerPhone),
        customerWhatsapp: formData.customerWhatsapp ? normalizePhone(formData.customerWhatsapp) : undefined,
        deliveryAddress: formData.deliveryAddress,
        state: formData.state,
        city: formData.city,
        productId: product.id,
        selectedPackages: [selectedPackageId],
        currency,
        utmParams,
        referrer,
      });

      if (result.success) {
        if (result.duplicate) {
          // Duplicate submission within 2 minutes — order already exists.
          // Do NOT redirect again (would fire the FB pixel twice for one order).
          // Just show the success state in place.
          setSuccess(true);
          return;
        }
        if (redirectUrl) {
          // Navigate the top-level page (breaks out of iframe).
          // Using location.href instead of window.open avoids popup blockers
          // and only fires the thank-you pixel after the order is confirmed saved.
          window.top!.location.href = redirectUrl;
        } else {
          router.push("/order-success");
        }
        return;
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
    <div
      className="w-full p-4 md:p-8 bg-white"
      style={{ colorScheme: "light" }}
    >
      <div className="max-w-md mx-auto">
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-800 text-sm font-medium">
              Order submitted successfully! We&apos;ll contact you shortly.
            </p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
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

          {/* Phone Number */}
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

          {/* WhatsApp Number */}
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
                setFormData({
                  ...formData,
                  customerWhatsapp: e.target.value,
                })
              }
              className="flex-1 px-4 py-2.5 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-600"
            />
          </div>

          {/* Address */}
          <input
            type="text"
            placeholder="Your Address *"
            required
            value={formData.deliveryAddress}
            onChange={(e) =>
              setFormData({
                ...formData,
                deliveryAddress: e.target.value,
              })
            }
            className="w-full px-4 py-2.5 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-600"
          />

          {/* City */}
          <input
            type="text"
            placeholder="Your City *"
            required
            value={formData.city}
            onChange={(e) =>
              setFormData({
                ...formData,
                city: e.target.value,
              })
            }
            className="w-full px-4 py-2.5 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-600"
          />

          {/* Delivery State */}
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

          {/* Package Selector */}
          <div className="mt-6">
            <PackageSelector
              packages={product.packages}
              selectedPackageId={selectedPackageId}
              onSelect={handlePackageSelect}
              currency={currency}
              packageSelectorNote={product.packageSelectorNote ?? ""}
            />
          </div>

          {/* Payment Method */}
          <div className="flex items-center gap-3 mt-6 px-2">
            <input
              type="radio"
              id="pod"
              name="payment"
              defaultChecked
              className="w-4 h-4 text-green-600 cursor-pointer"
            />
            <label
              htmlFor="pod"
              className="flex items-center gap-2 cursor-pointer"
            >
              <div className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                <span>💳</span>
                <span>Pay On Delivery</span>
              </div>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-500 text-white py-2.5 px-4 rounded-lg text-base font-bold hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors cursor-pointer mt-6"
          >
            {loading ? "SUBMITTING..." : "ORDER NOW"}
          </button>
        </form>
      </div>
    </div>
  );
}
