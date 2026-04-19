"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Check, Copy, ExternalLink, Package, PackageX } from "lucide-react";
import Link from "next/link";
import { getAvailableCurrencies } from "@/lib/currency";
import type { Currency } from "@prisma/client";

interface Product {
  id: string;
  name: string;
  description: string | null;
  packageCount: number;
}

interface EmbedFormGeneratorProps {
  products: Product[];
}

export function EmbedFormGenerator({ products }: EmbedFormGeneratorProps) {
  const [generatedUrls, setGeneratedUrls] = useState<Record<string, string>>(
    {},
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<
    Record<string, Currency>
  >({});
  const [productRedirectUrls, setProductRedirectUrls] = useState<
    Record<string, string>
  >({});

  const generateEmbedUrl = (productId: string) => {
    const baseUrl = window.location.origin;
    const currency = selectedCurrency[productId] || "NGN";
    const productRedirectUrl = productRedirectUrls[productId];
    const redirectParam = productRedirectUrl ? `&redirectUrl=${encodeURIComponent(productRedirectUrl)}` : "";
    const embedUrl = `${baseUrl}/order-form/embed?product=${productId}&currency=${currency}${redirectParam}`;
    setGeneratedUrls((prev) => ({ ...prev, [productId]: embedUrl }));
    return embedUrl;
  };

  const copyToClipboard = async (productId: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(productId);
      toast.success("Embed URL copied to clipboard!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast.error("Failed to copy URL");
    }
  };

  const productsWithPackages = products.filter((p) => p.packageCount > 0);
  const productsWithoutPackages = products.filter((p) => p.packageCount === 0);

  return (
    <div className="space-y-6">
      {/* Products with packages */}
      {productsWithPackages.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold">
              Products Ready for Embed ({productsWithPackages.length})
            </h2>
            <p className="text-sm text-muted-foreground">
              These products have packages and can generate embed forms
            </p>
          </div>

          <div className="grid gap-4">
            {productsWithPackages.map((product) => {
              const embedUrl = generatedUrls[product.id];
              const isCopied = copiedId === product.id;

              return (
                <Card key={product.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded bg-green-100 dark:bg-green-900 flex items-center justify-center">
                            <Package className="size-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <CardTitle>{product.name}</CardTitle>
                            <CardDescription>
                              {product.description || "No description"}
                            </CardDescription>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="gap-1">
                          <Package className="size-3" />
                          {product.packageCount} package
                          {product.packageCount !== 1 ? "s" : ""}
                        </Badge>
                        <Link
                          href={`/dashboard/admin/inventory/${product.id}/packages`}
                        >
                          <Button size="sm" variant="outline">
                            Manage Packages
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {!embedUrl ? (
                      <>
                        <div className="space-y-2">
                          <label className="text-sm font-medium" htmlFor={`redirect-url-${product.id}`}>
                            Redirect URL (Optional)
                          </label>
                          <Input
                            id={`redirect-url-${product.id}`}
                            value={productRedirectUrls[product.id] || ""}
                            onChange={(e) =>
                              setProductRedirectUrls((prev) => ({
                                ...prev,
                                [product.id]: e.target.value,
                              }))
                            }
                            placeholder="https://yourwebsite.com/thank-you"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Optional URL to redirect the user to after a successful order.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Select Currency
                          </label>
                          <Select
                            value={selectedCurrency[product.id] || "NGN"}
                            onValueChange={(value) =>
                              setSelectedCurrency((prev) => ({
                                ...prev,
                                [product.id]: value as Currency,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                            <SelectContent>
                              {getAvailableCurrencies().map((curr) => (
                                <SelectItem key={curr.code} value={curr.code}>
                                  {curr.symbol} - {curr.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          onClick={() => generateEmbedUrl(product.id)}
                          className="w-full"
                        >
                          Generate Embed URL
                        </Button>
                      </>
                    ) : (
                      <div className="space-y-3">
                        <Tabs defaultValue="url" className="w-full">
                          <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="url">Direct Link</TabsTrigger>
                            <TabsTrigger value="iframe">
                              HTML/Iframe
                            </TabsTrigger>
                            <TabsTrigger value="elementor">
                              Elementor
                            </TabsTrigger>
                          </TabsList>

                          {/* Direct Link Tab */}
                          <TabsContent value="url" className="space-y-2">
                            <p className="text-xs text-muted-foreground">
                              Share this direct link to your order form
                            </p>
                            <div className="flex gap-2">
                              <Input
                                value={embedUrl}
                                readOnly
                                className="font-mono text-xs"
                              />
                              <Button
                                variant={isCopied ? "default" : "outline"}
                                size="icon"
                                onClick={() =>
                                  copyToClipboard(product.id, embedUrl)
                                }
                              >
                                {isCopied ? (
                                  <Check className="size-4" />
                                ) : (
                                  <Copy className="size-4" />
                                )}
                              </Button>
                              <Link href={embedUrl} target="_blank">
                                <Button variant="outline" size="icon">
                                  <ExternalLink className="size-4" />
                                </Button>
                              </Link>
                            </div>
                          </TabsContent>

                          {/* Iframe Tab */}
                          <TabsContent value="iframe" className="space-y-2">
                            <p className="text-xs text-muted-foreground">
                              Copy and paste this code into your HTML page
                            </p>
                            <div className="relative">
                              <pre className="bg-muted p-3 rounded-lg overflow-x-auto text-xs">
                                <code>{`<iframe
  id="ordo-order-embed"
  src="${embedUrl}"
  width="100%"
  height="800"
  frameborder="0"
  scrolling="no"
  style="border: none; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;"
  title="${product.name} Order Form"
></iframe>

<script>
  (function() {
    var iframe = document.getElementById("ordo-order-embed");
    if (!iframe) return;

    // Forward UTM params from this page into the iframe so orders
    // are correctly attributed to Facebook / TikTok / etc.
    var utmKeys = ["utm_source","utm_medium","utm_campaign","utm_content","utm_term"];
    var pageParams = new URLSearchParams(window.location.search);
    var extra = "";
    utmKeys.forEach(function(k) {
      var v = pageParams.get(k);
      if (v) extra += "&" + k + "=" + encodeURIComponent(v);
    });
    if (extra) iframe.src = iframe.src + extra;

    // Auto-resize iframe to fit form content
    window.addEventListener("message", function(e) {
      if (e.data && e.data.type === "ordo-resize") {
        iframe.style.height = (e.data.height + 20) + "px";
      }
    });
  })();
</script>`}</code>
                              </pre>
                              <Button
                                size="sm"
                                variant="outline"
                                className="absolute top-2 right-2"
                                onClick={() => {
                                  const iframeCode = `<iframe
  id="ordo-order-embed"
  src="${embedUrl}"
  width="100%"
  height="800"
  frameborder="0"
  scrolling="no"
  style="border: none; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;"
  title="${product.name} Order Form"
></iframe>

<script>
  (function() {
    var iframe = document.getElementById("ordo-order-embed");
    if (!iframe) return;

    // Forward UTM params from this page into the iframe so orders
    // are correctly attributed to Facebook / TikTok / etc.
    var utmKeys = ["utm_source","utm_medium","utm_campaign","utm_content","utm_term"];
    var pageParams = new URLSearchParams(window.location.search);
    var extra = "";
    utmKeys.forEach(function(k) {
      var v = pageParams.get(k);
      if (v) extra += "&" + k + "=" + encodeURIComponent(v);
    });
    if (extra) iframe.src = iframe.src + extra;

    // Auto-resize iframe to fit form content
    window.addEventListener("message", function(e) {
      if (e.data && e.data.type === "ordo-resize") {
        iframe.style.height = (e.data.height + 20) + "px";
      }
    });
  })();
</script>`;
                                  navigator.clipboard.writeText(iframeCode);
                                  toast.success("Iframe code copied!");
                                }}
                              >
                                <Copy className="size-3 mr-1" />
                                Copy
                              </Button>
                            </div>
                          </TabsContent>

                          {/* Elementor Tab */}
                          <TabsContent value="elementor" className="space-y-3">
                            <p className="text-xs text-muted-foreground">
                              For WordPress with Elementor page builder
                            </p>

                            <div className="relative">
                              <pre className="bg-muted p-3 rounded-lg overflow-x-auto text-xs">
                                <code>{`<iframe
  id="ordo-order-embed"
  src="${embedUrl}"
  width="100%"
  height="800"
  frameborder="0"
  scrolling="no"
  style="border: none; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;"
  title="${product.name} Order Form"
></iframe>

<script>
  (function() {
    var iframe = document.getElementById("ordo-order-embed");
    if (!iframe) return;

    // Forward UTM params from this page into the iframe so orders
    // are correctly attributed to Facebook / TikTok / etc.
    var utmKeys = ["utm_source","utm_medium","utm_campaign","utm_content","utm_term"];
    var pageParams = new URLSearchParams(window.location.search);
    var extra = "";
    utmKeys.forEach(function(k) {
      var v = pageParams.get(k);
      if (v) extra += "&" + k + "=" + encodeURIComponent(v);
    });
    if (extra) iframe.src = iframe.src + extra;

    // Auto-resize iframe to fit form content
    window.addEventListener("message", function(e) {
      if (e.data && e.data.type === "ordo-resize") {
        iframe.style.height = (e.data.height + 20) + "px";
      }
    });
  })();
</script>`}</code>
                              </pre>
                              <Button
                                size="sm"
                                variant="outline"
                                className="absolute top-2 right-2"
                                onClick={() => {
                                  const iframeCode = `<iframe
  id="ordo-order-embed"
  src="${embedUrl}"
  width="100%"
  height="800"
  frameborder="0"
  scrolling="no"
  style="border: none; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;"
  title="${product.name} Order Form"
></iframe>

<script>
  (function() {
    var iframe = document.getElementById("ordo-order-embed");
    if (!iframe) return;

    // Forward UTM params from this page into the iframe so orders
    // are correctly attributed to Facebook / TikTok / etc.
    var utmKeys = ["utm_source","utm_medium","utm_campaign","utm_content","utm_term"];
    var pageParams = new URLSearchParams(window.location.search);
    var extra = "";
    utmKeys.forEach(function(k) {
      var v = pageParams.get(k);
      if (v) extra += "&" + k + "=" + encodeURIComponent(v);
    });
    if (extra) iframe.src = iframe.src + extra;

    // Auto-resize iframe to fit form content
    window.addEventListener("message", function(e) {
      if (e.data && e.data.type === "ordo-resize") {
        iframe.style.height = (e.data.height + 20) + "px";
      }
    });
  })();
</script>`;
                                  navigator.clipboard.writeText(iframeCode);
                                  toast.success("Elementor code copied!");
                                }}
                              >
                                <Copy className="size-3 mr-1" />
                                Copy
                              </Button>
                            </div>

                            <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
                              <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-2">
                                Elementor Integration Steps:
                              </p>
                              <ol className="text-xs text-blue-800 dark:text-blue-200 space-y-1 ml-4 list-decimal">
                                <li>Open your page in Elementor editor</li>
                                <li>
                                  Drag an &quot;HTML&quot; widget to your page
                                </li>
                                <li>
                                  Click &quot;Copy&quot; button above and paste
                                  the code into the HTML widget
                                </li>
                                <li>
                                  Set widget width to &quot;Full Width
                                  (100%)&quot; for best results
                                </li>
                                <li>
                                  Adjust height if needed (recommended: 800px
                                  minimum)
                                </li>
                                <li>Update and preview your page</li>
                              </ol>
                            </div>
                          </TabsContent>
                        </Tabs>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Products without packages */}
      {productsWithoutPackages.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold">
              Products Without Packages ({productsWithoutPackages.length})
            </h2>
            <p className="text-sm text-muted-foreground">
              Create packages for these products to enable embed forms
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {productsWithoutPackages.map((product) => (
              <Card key={product.id} className="opacity-60">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded bg-muted flex items-center justify-center">
                          <PackageX className="size-5 text-muted-foreground" />
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            {product.name}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {product.description || "No description"}
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground italic">
                      No packages set yet for this product
                    </p>
                    <Link
                      href={`/dashboard/admin/inventory/${product.id}/packages`}
                    >
                      <Button size="sm" variant="outline">
                        Create Packages
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {products.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <PackageX className="size-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Products Found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create products in the inventory section first
            </p>
            <Link href="/dashboard/admin/inventory">
              <Button>Go to Inventory</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
