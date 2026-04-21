"use client";

import { useState, useEffect, useRef } from "react";
import { createOrderV2 } from "@/app/actions/orders";
import {
  getActiveProducts,
  getProductWithPackages,
} from "@/app/actions/products";
import { PackageSelector } from "./package-selector";
import { PayOnDeliveryBadge } from "./pay-on-delivery-badge";
import { NIGERIA_STATES } from "@/lib/nigeria-states";
import type { ProductPackage, Currency } from "@prisma/client";
import type { UTMParams } from "@/lib/utm-parser";
import { parseUTMParams, extractReferrerDomain } from "@/lib/utm-parser";
import { getAvailableCurrencies } from "@/lib/currency";
import { useSearchParams } from "next/navigation"; // Import useSearchParams

type Product = {
  id: string;
  name: string;
  price: number;
  currentStock: number;
};

export default function OrderFormPageClient() {
  const searchParams = useSearchParams(); // Get search params
  const redirectUrl = searchParams.get("redirectUrl"); // Extract redirectUrl
  const organizationId = searchParams.get("org") ?? "";
  const submittingRef = useRef(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [packages, setPackages] = useState<ProductPackage[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null); // Store full product with packages
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>("NGN");
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [utmParams, setUtmParams] = useState<UTMParams | undefined>();
  const [referrer, setReferrer] = useState<string | undefined>();

  const [formData, setFormData] = useState({
    customerName: "",
    phoneCountryCode: "+234",
    customerPhone: "",
    whatsappCountryCode: "+234",
    customerWhatsapp: "",
    deliveryAddress: "",
    state: "",
    city: "",
  });

  useEffect(() => {
    loadProducts();

    // Capture UTM params and referrer on mount
    if (typeof window !== "undefined") {
      const params = parseUTMParams(window.location.href);
      if (params.source) setUtmParams(params);

      const ref = extractReferrerDomain();
      if (ref) setReferrer(ref);
    }
  }, []);

  async function loadProducts() {
    if (!organizationId) {
      setError("Invalid order form link. Please use the link provided by the store.");
      return;
    }
    const result = await getActiveProducts(organizationId);
    if (result.success && result.products && result.products.length > 0) {
      setProducts(result.products);
      // Auto-select the first product
      const firstProduct = result.products[0];
      await handleProductChange(firstProduct.id);
    } else if (!result.success) {
      setError("Unable to load products. Please refresh the page and try again.");
    }
  }

  async function handleProductChange(productId: string) {
    setSelectedProductId(productId);
    setSelectedPackageId("");
    setPackages([]);
    setSelectedProduct(null);
    setError("");

    if (!productId) return;

    setLoadingPackages(true);
    const result = await getProductWithPackages(productId);
    setLoadingPackages(false);

    if (result.success && result.data) {
      setSelectedProduct(result.data); // Store full product object
      setPackages(result.data.packages);
    } else {
      setError(
        result.error ||
          "This product has no available packages. Please select another product.",
      );
    }
  }

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

    if (!selectedProductId) {
      setError("Please select a product");
      setLoading(false);
      submittingRef.current = false;
      return;
    }

    if (!selectedPackageId) {
      setError("Please select a package");
      setLoading(false);
      submittingRef.current = false;
      return;
    }

    // Strip leading zero before prepending country code (e.g. "0812..." → "+234812...")
    const normalizePhone = (code: string, raw: string) => code + raw.replace(/^0/, "")
    const fullPhone = normalizePhone(formData.phoneCountryCode, formData.customerPhone);
    const fullWhatsapp = formData.customerWhatsapp
      ? normalizePhone(formData.whatsappCountryCode, formData.customerWhatsapp)
      : undefined;

    const result = await createOrderV2({
      organizationId,
      customerName: formData.customerName,
      customerPhone: fullPhone,
      customerWhatsapp: fullWhatsapp,
      deliveryAddress: formData.deliveryAddress,
      state: formData.state,
      city: formData.city,
      productId: selectedProductId,
      selectedPackages: [selectedPackageId],
      currency: selectedCurrency,
      utmParams,
      referrer,
    });

    setLoading(false);
    submittingRef.current = false;

    if (result.success) {
      if (redirectUrl) {
        // Navigate top-level page AFTER order is confirmed saved in DB
        window.top!.location.href = redirectUrl;
      } else {
        setSuccess(true);
        setFormData({
          customerName: "",
          phoneCountryCode: "+234",
          customerPhone: "",
          whatsappCountryCode: "+234",
          customerWhatsapp: "",
          deliveryAddress: "",
          state: "",
          city: "",
        });
        setSelectedProductId("");
        setSelectedPackageId("");
        setPackages([]);

        setTimeout(() => setSuccess(false), 5000);
      }
    } else {
      setError(result.error || "Failed to submit order. Please try again.");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {success &&
            !redirectUrl && ( // Only show success message if no redirect is happening
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 font-medium">
                  Order submitted successfully! We&apos;ll contact you shortly.
                </p>
              </div>
            )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Field */}
            <div>
              <input
                type="text"
                required
                placeholder="Your Name *"
                value={formData.customerName}
                onChange={(e) =>
                  setFormData({ ...formData, customerName: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500"
              />
            </div>

            {/* Phone Number with Country Code */}
            <div className="flex gap-3">
              <select
                value={formData.phoneCountryCode}
                onChange={(e) =>
                  setFormData({ ...formData, phoneCountryCode: e.target.value })
                }
                className="w-24 px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900"
              >
                <option value="+234">+234</option>
                <option value="+233">+233</option>
                <option value="+1">+1</option>
                <option value="+44">+44</option>
              </select>
              <input
                type="tel"
                required
                placeholder="Your Phone Number *"
                value={formData.customerPhone}
                onChange={(e) =>
                  setFormData({ ...formData, customerPhone: e.target.value })
                }
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500"
              />
            </div>

            {/* WhatsApp Number with Country Code */}
            <div className="flex gap-3">
              <select
                value={formData.whatsappCountryCode}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    whatsappCountryCode: e.target.value,
                  })
                }
                className="w-24 px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900"
              >
                <option value="+234">+234</option>
                <option value="+233">+233</option>
                <option value="+1">+1</option>
                <option value="+44">+44</option>
              </select>
              <input
                type="tel"
                placeholder="Your WhatsApp Number *"
                value={formData.customerWhatsapp}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    customerWhatsapp: e.target.value,
                  })
                }
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500"
              />
            </div>

            {/* Address Field */}
            <div>
              <input
                type="text"
                required
                placeholder="Your Address *"
                value={formData.deliveryAddress}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    deliveryAddress: e.target.value,
                  })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500"
              />
            </div>

            {/* State Dropdown */}
            <div>
              <label className="block text-sm font-medium text-purple-900 mb-1">
                Your Delivery State *
              </label>
              <select
                required
                value={formData.state}
                onChange={(e) =>
                  setFormData({ ...formData, state: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900"
              >
                <option value="">Select state</option>
                {NIGERIA_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>

            {/* Package Selection */}
            {loadingPackages && (
              <div className="text-center py-8">
                <p className="text-gray-600">Loading packages...</p>
              </div>
            )}

            {/*TODO: Implement redirect to*/}
            {packages.length > 0 && !loadingPackages && (
              <PackageSelector
                packages={packages}
                selectedPackageId={selectedPackageId}
                onSelect={handlePackageSelect}
                currency={selectedCurrency}
              />
            )}

            {/* Pay On Delivery Badge */}
            {selectedPackageId && (
              <div className="pt-4">
                <PayOnDeliveryBadge />
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !selectedPackageId}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-4 px-6 rounded-lg font-bold text-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-md"
            >
              {loading ? "SUBMITTING..." : "ORDER NOW"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
