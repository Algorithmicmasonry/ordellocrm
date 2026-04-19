"use client";

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Loader2, Trash2, Plus, Package, User2, Warehouse } from "lucide-react";
import {
  createManualOrder,
  getAvailableProducts,
  getAgentsWithStock,
} from "../actions";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { OrderSource, Currency, ProductPackage } from "@prisma/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getCurrencySymbol } from "@/lib/currency";

// ── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  price: number;
  currentStock: number;
  agentStockTotal: number;
  currency: Currency;
  packageSelectorNote: string | null;
  packages: ProductPackage[];
}

interface AgentStock {
  productId: string;
  quantity: number;
}

interface Agent {
  id: string;
  name: string;
  location: string;
  phone: string;
  stock: AgentStock[];
}

interface OrderItem {
  productId: string;
  packageId: string; // "" means no package selected yet (or product has no packages)
  quantity: number;  // used only when no package is selected
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CreateOrderDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Products & agents
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    customerWhatsapp: "",
    deliveryAddress: "",
    state: "",
    city: "",
    source: "WHATSAPP" as OrderSource,
  });
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [orderItems, setOrderItems] = useState<OrderItem[]>([
    { productId: "", packageId: "", quantity: 1 },
  ]);

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (open) loadProducts();
  }, [open]);

  // Reload agents whenever the product selection changes or state is filled
  useEffect(() => {
    const productIds = orderItems
      .map((i) => i.productId)
      .filter(Boolean);

    if (productIds.length === 0) {
      setAgents([]);
      setSelectedAgentId("");
      return;
    }

    loadAgents(productIds);
  }, [orderItems.map((i) => i.productId).join(",")]);

  // ── Loaders ────────────────────────────────────────────────────────────────

  const loadProducts = async () => {
    setLoadingProducts(true);
    const result = await getAvailableProducts();
    if (result.success && result.data) {
      setProducts(result.data as Product[]);
    }
    setLoadingProducts(false);
  };

  const loadAgents = async (productIds: string[]) => {
    setLoadingAgents(true);
    const result = await getAgentsWithStock(productIds);
    if (result.success && result.data) {
      setAgents(result.data as Agent[]);
    } else {
      setAgents([]);
    }
    setLoadingAgents(false);
  };

  // ── Order item helpers ─────────────────────────────────────────────────────

  const addOrderItem = () => {
    setOrderItems([...orderItems, { productId: "", packageId: "", quantity: 1 }]);
  };

  const removeOrderItem = (index: number) => {
    if (orderItems.length > 1) {
      setOrderItems(orderItems.filter((_, i) => i !== index));
    }
  };

  const updateProduct = (index: number, productId: string) => {
    const updated = [...orderItems];
    updated[index] = { ...updated[index], productId, packageId: "", quantity: 1 };
    setOrderItems(updated);
  };

  const updatePackage = (index: number, packageId: string) => {
    const updated = [...orderItems];
    updated[index] = { ...updated[index], packageId };
    setOrderItems(updated);
  };

  const updateQuantity = (index: number, quantity: number) => {
    const updated = [...orderItems];
    updated[index] = { ...updated[index], quantity };
    setOrderItems(updated);
  };

  // ── Derived data ───────────────────────────────────────────────────────────

  const getProductById = (id: string) => products.find((p) => p.id === id);

  const getPackageById = (productId: string, pkgId: string) => {
    const product = getProductById(productId);
    return product?.packages.find((p) => p.id === pkgId);
  };

  const getAgentStockForProduct = (agent: Agent, productId: string) =>
    agent.stock.find((s) => s.productId === productId)?.quantity ?? 0;

  /** Price displayed per line item */
  const getItemPrice = (item: OrderItem): number => {
    if (item.packageId) {
      const pkg = getPackageById(item.productId, item.packageId);
      return pkg?.price ?? 0;
    }
    const product = getProductById(item.productId);
    return (product?.price ?? 0) * item.quantity;
  };

  const calculateTotal = () =>
    orderItems.reduce((sum, item) => sum + getItemPrice(item), 0);

  const currencySymbol = () => {
    const firstProductId = orderItems.find((i) => i.productId)?.productId;
    if (!firstProductId) return "₦";
    const product = getProductById(firstProductId);
    return product ? getCurrencySymbol(product.currency) : "₦";
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (!formData.customerPhone.trim()) {
      toast.error("Customer phone is required");
      return;
    }
    if (!formData.deliveryAddress.trim()) {
      toast.error("Delivery address is required");
      return;
    }
    if (!formData.city.trim() || !formData.state.trim()) {
      toast.error("City and state are required");
      return;
    }

    const validItems = orderItems.filter((item) => {
      if (!item.productId) return false;
      const product = getProductById(item.productId);
      // If product has packages, a package must be selected
      if (product && product.packages.length > 0 && !item.packageId) {
        return false;
      }
      return true;
    });

    if (validItems.length === 0) {
      toast.error("Please add at least one product (and select a package if required)");
      return;
    }

    // Warn if a product with packages has no package selected
    const missingPackage = orderItems.find((item) => {
      if (!item.productId) return false;
      const product = getProductById(item.productId);
      return product && product.packages.length > 0 && !item.packageId;
    });
    if (missingPackage) {
      const product = getProductById(missingPackage.productId);
      toast.error(`Please select a package for "${product?.name}"`);
      return;
    }

    startTransition(async () => {
      const result = await createManualOrder({
        ...formData,
        agentId: selectedAgentId || undefined,
        items: validItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          packageId: item.packageId || undefined,
        })),
      });

      if (result.success && result.data) {
        toast.success("Order created successfully!");
        setOpen(false);
        resetForm();
        router.refresh();
        router.push(`/dashboard/sales-rep/orders/${result.data.id}`);
      } else {
        toast.error(result.error || "Failed to create order");
      }
    });
  };

  const resetForm = () => {
    setFormData({
      customerName: "",
      customerPhone: "",
      customerWhatsapp: "",
      deliveryAddress: "",
      state: "",
      city: "",
      source: "WHATSAPP",
    });
    setOrderItems([{ productId: "", packageId: "", quantity: 1 }]);
    setSelectedAgentId("");
    setAgents([]);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const hasSelectedProducts = orderItems.some((i) => i.productId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <PlusCircle className="size-4" />
          Create Order
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Create New Order</DialogTitle>
          <DialogDescription>
            Manually create an order for a customer. The order will be assigned
            to you.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-200px)] pr-4">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* ── Customer Information ───────────────────────────────────── */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Customer Information</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Customer Name *</Label>
                  <Input
                    id="customerName"
                    value={formData.customerName}
                    onChange={(e) =>
                      setFormData({ ...formData, customerName: e.target.value })
                    }
                    placeholder="John Doe"
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Phone Number *</Label>
                  <Input
                    id="customerPhone"
                    type="tel"
                    value={formData.customerPhone}
                    onChange={(e) =>
                      setFormData({ ...formData, customerPhone: e.target.value })
                    }
                    placeholder="+234 XXX XXX XXXX"
                    disabled={isPending}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerWhatsapp">
                  WhatsApp Number (Optional)
                </Label>
                <Input
                  id="customerWhatsapp"
                  type="tel"
                  value={formData.customerWhatsapp}
                  onChange={(e) =>
                    setFormData({ ...formData, customerWhatsapp: e.target.value })
                  }
                  placeholder="+234 XXX XXX XXXX"
                  disabled={isPending}
                />
              </div>
            </div>

            {/* ── Delivery Information ───────────────────────────────────── */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Delivery Information</h3>

              <div className="space-y-2">
                <Label htmlFor="deliveryAddress">Delivery Address *</Label>
                <Textarea
                  id="deliveryAddress"
                  value={formData.deliveryAddress}
                  onChange={(e) =>
                    setFormData({ ...formData, deliveryAddress: e.target.value })
                  }
                  placeholder="123 Main Street, Apartment 4B"
                  rows={3}
                  disabled={isPending}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    placeholder="Lagos"
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) =>
                      setFormData({ ...formData, state: e.target.value })
                    }
                    placeholder="Lagos State"
                    disabled={isPending}
                  />
                </div>
              </div>
            </div>

            {/* ── Order Items ────────────────────────────────────────────── */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Order Items</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addOrderItem}
                  disabled={isPending || loadingProducts}
                >
                  <Plus className="size-4 mr-2" />
                  Add Item
                </Button>
              </div>

              {loadingProducts ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-4">
                  {orderItems.map((item, index) => {
                    const product = getProductById(item.productId);
                    const hasPackages =
                      product && product.packages.length > 0;

                    return (
                      <div
                        key={index}
                        className="border rounded-lg p-4 space-y-4"
                      >
                        {/* Product selector row */}
                        <div className="flex gap-3 items-end">
                          <div className="flex-1 space-y-2">
                            <Label htmlFor={`product-${index}`}>
                              Product *
                            </Label>
                            <Select
                              value={item.productId}
                              onValueChange={(value) =>
                                updateProduct(index, value)
                              }
                              disabled={isPending}
                            >
                              <SelectTrigger id={`product-${index}`}>
                                <SelectValue placeholder="Select product" />
                              </SelectTrigger>
                              <SelectContent>
                                {products.map((p) => {
                                  const total =
                                    p.currentStock + p.agentStockTotal;
                                  return (
                                    <SelectItem key={p.id} value={p.id}>
                                      {p.name} — {getCurrencySymbol(p.currency)}
                                      {p.price.toLocaleString()} (Stock: {total})
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Quantity — only shown when product has no packages */}
                          {product && !hasPackages && (
                            <div className="w-24 space-y-2">
                              <Label htmlFor={`quantity-${index}`}>Qty *</Label>
                              <Input
                                id={`quantity-${index}`}
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) =>
                                  updateQuantity(
                                    index,
                                    parseInt(e.target.value) || 1
                                  )
                                }
                                disabled={isPending}
                              />
                            </div>
                          )}

                          {orderItems.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeOrderItem(index)}
                              disabled={isPending}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          )}
                        </div>

                        {/* Stock badge */}
                        {product && (
                          <div className="flex gap-2 flex-wrap">
                            <Badge variant="outline" className="gap-1 text-xs">
                              <Warehouse className="size-3" />
                              Warehouse: {product.currentStock}
                            </Badge>
                            <Badge
                              variant={
                                product.agentStockTotal > 0
                                  ? "secondary"
                                  : "outline"
                              }
                              className="gap-1 text-xs"
                            >
                              <User2 className="size-3" />
                              With Agents: {product.agentStockTotal}
                            </Badge>
                          </div>
                        )}

                        {/* Package selector */}
                        {hasPackages && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Package className="size-4 text-muted-foreground" />
                              <Label className="text-sm font-medium">
                                Select Package *
                              </Label>
                            </div>

                            {product.packageSelectorNote && (
                              <p className="text-xs text-muted-foreground bg-muted px-3 py-2 rounded-md">
                                {product.packageSelectorNote}
                              </p>
                            )}

                            <div className="space-y-2">
                              {product.packages.map((pkg) => {
                                const sym = getCurrencySymbol(pkg.currency);
                                const isSelected = item.packageId === pkg.id;

                                return (
                                  <label
                                    key={pkg.id}
                                    className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                                      isSelected
                                        ? "border-primary bg-primary/5"
                                        : "border-border hover:bg-muted/50"
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={`package-${index}`}
                                      value={pkg.id}
                                      checked={isSelected}
                                      onChange={() =>
                                        updatePackage(index, pkg.id)
                                      }
                                      disabled={isPending}
                                      className="accent-primary"
                                    />
                                    <span className="flex-1 text-sm font-medium">
                                      {pkg.description || pkg.name}
                                    </span>
                                    <span className="text-sm font-bold text-primary">
                                      {sym}
                                      {pkg.price.toLocaleString()}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Agent Assignment ───────────────────────────────────────── */}
            {hasSelectedProducts && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm">Assign Agent</h3>
                  {loadingAgents && (
                    <Loader2 className="size-3 animate-spin text-muted-foreground" />
                  )}
                </div>

                {!loadingAgents && agents.length === 0 ? (
                  <p className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">
                    No agents currently have stock for the selected product(s).
                  </p>
                ) : (
                  <div className="space-y-2">
                    {/* "None" option */}
                    <label
                      className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                        selectedAgentId === ""
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="agent"
                        value=""
                        checked={selectedAgentId === ""}
                        onChange={() => setSelectedAgentId("")}
                        disabled={isPending}
                        className="accent-primary"
                      />
                      <span className="text-sm text-muted-foreground">
                        No agent (warehouse stock)
                      </span>
                    </label>

                    {agents.map((agent) => {
                      const selectedProductIds = orderItems
                        .map((i) => i.productId)
                        .filter(Boolean);

                      return (
                        <label
                          key={agent.id}
                          className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                            selectedAgentId === agent.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:bg-muted/50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="agent"
                            value={agent.id}
                            checked={selectedAgentId === agent.id}
                            onChange={() => setSelectedAgentId(agent.id)}
                            disabled={isPending}
                            className="accent-primary mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{agent.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {agent.location} · {agent.phone}
                            </p>
                            <div className="flex gap-2 flex-wrap mt-1">
                              {selectedProductIds.map((pid) => {
                                const qty = getAgentStockForProduct(
                                  agent,
                                  pid
                                );
                                const product = getProductById(pid);
                                if (!product) return null;
                                return (
                                  <Badge
                                    key={pid}
                                    variant={qty > 0 ? "secondary" : "outline"}
                                    className="text-xs"
                                  >
                                    {product.name}: {qty} units
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Order Source ───────────────────────────────────────────── */}
            <div className="space-y-2">
              <Label htmlFor="source">Order Source *</Label>
              <Select
                value={formData.source}
                onValueChange={(value) =>
                  setFormData({ ...formData, source: value as OrderSource })
                }
                disabled={isPending}
              >
                <SelectTrigger id="source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                  <SelectItem value="FACEBOOK">Facebook</SelectItem>
                  <SelectItem value="TIKTOK">TikTok</SelectItem>
                  <SelectItem value="WEBSITE">Website</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* ── Total ──────────────────────────────────────────────────── */}
            {hasSelectedProducts && (
              <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                <span className="font-semibold">Total Amount:</span>
                <span className="text-2xl font-bold text-primary">
                  {currencySymbol()}
                  {calculateTotal().toLocaleString()}
                </span>
              </div>
            )}

            {/* ── Actions ────────────────────────────────────────────────── */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || loadingProducts}>
                {isPending ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Order"
                )}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
