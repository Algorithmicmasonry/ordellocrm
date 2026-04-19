import { Truck } from "lucide-react";

export function PayOnDeliveryBadge() {
  return (
    <div className="flex items-center gap-3">
      <input
        type="radio"
        checked={true}
        readOnly
        className="w-4 h-4 text-blue-600"
      />
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm">
        <Truck className="w-4 h-4" />
        <span className="font-semibold text-sm">Pay On Delivery</span>
      </div>
    </div>
  );
}
