"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "react-hot-toast";

export function EmbedCodeGenerator() {
  const [copied, setCopied] = useState(false);
  const [width, setWidth] = useState("100%");
  const [height, setHeight] = useState("800");
  const [redirectUrl, setRedirectUrl] = useState("");

  const baseUrl = typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const embedUrl = `${baseUrl}/order-form/embed${redirectUrl ? `?redirectUrl=${encodeURIComponent(redirectUrl)}` : ""}`;

  // Generate iframe embed code
  const iframeCode = `<iframe
  src="${embedUrl}"
  width="${width}"
  height="${height}"
  frameborder="0"
  style="border: none; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
  title="Order Form"
></iframe>`;

  // Generate Elementor shortcode (WordPress)
  const elementorCode = `[elementor-template id="order-form"]
<!-- Add this to your theme's functions.php or use a shortcode plugin: -->
<?php
function ordo_order_form_shortcode() {
    return '<iframe src="${embedUrl}" width="${width}" height="${height}" frameborder="0" style="border: none; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" title="Order Form"></iframe>';
}
add_shortcode('ordo_order_form', 'ordo_order_form_shortcode');
?>`;

  // Generate JavaScript embed code
  const jsCode = `<div id="ordo-order-form"></div>
<script>
  (function() {
    var iframe = document.createElement('iframe');
    iframe.src = '${embedUrl}';
    iframe.width = '${width}';
    iframe.height = '${height}';
    iframe.frameBorder = '0';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '8px';
    iframe.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
    iframe.title = 'Order Form';
    document.getElementById('ordo-order-form').appendChild(iframe);
  })();
</script>`;

  const handleCopy = (code: string, type: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success(`${type} code copied to clipboard!`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Customize Embed</CardTitle>
          <CardDescription>
            Adjust the dimensions of your embedded order form
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="width">Width</Label>
              <Input
                id="width"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                placeholder="100%"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use px (e.g., 600) or % (e.g., 100%)
              </p>
            </div>
            <div>
              <Label htmlFor="height">Height (px)</Label>
              <Input
                id="height"
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="800"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Recommended: 800-1000px
              </p>
            </div>
          </div>

          <div className="pt-4">
            <Label htmlFor="redirectUrl">Redirect URL (Optional)</Label>
            <Input
              id="redirectUrl"
              value={redirectUrl}
              onChange={(e) => setRedirectUrl(e.target.value)}
              placeholder="https://yourwebsite.com/thank-you"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Optional URL to redirect the user to after a successful order.
            </p>
          </div>

          <div className="pt-4">
            <Label>Preview URL</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input value={embedUrl} readOnly className="font-mono text-sm" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => window.open(embedUrl, "_blank")}
              >
                <ExternalLink className="size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Embed Code</CardTitle>
          <CardDescription>
            Choose your integration method and copy the code
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="iframe" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="iframe">HTML/iframe</TabsTrigger>
              <TabsTrigger value="elementor">Elementor</TabsTrigger>
              <TabsTrigger value="javascript">JavaScript</TabsTrigger>
            </TabsList>

            <TabsContent value="iframe" className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-3">
                  Copy and paste this code into your HTML page where you want the form to appear.
                </p>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
                    <code>{iframeCode}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2"
                    onClick={() => handleCopy(iframeCode, "HTML")}
                  >
                    {copied ? (
                      <Check className="size-4 mr-2" />
                    ) : (
                      <Copy className="size-4 mr-2" />
                    )}
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="elementor" className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-3">
                  For WordPress with Elementor: Add an HTML widget and paste this code, or add the shortcode to your theme.
                </p>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
                    <code>{elementorCode}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2"
                    onClick={() => handleCopy(elementorCode, "Elementor")}
                  >
                    {copied ? (
                      <Check className="size-4 mr-2" />
                    ) : (
                      <Copy className="size-4 mr-2" />
                    )}
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </div>
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-900 font-medium mb-1">
                    Elementor Integration Steps:
                  </p>
                  <ol className="text-xs text-blue-800 space-y-1 ml-4 list-decimal">
                    <li>Open your page in Elementor editor</li>
                    <li>Drag an "HTML" widget to your page</li>
                    <li>Paste the iframe code into the HTML widget</li>
                    <li>Adjust widget width to "Full Width" for best results</li>
                    <li>Save and preview your page</li>
                  </ol>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="javascript" className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-3">
                  Use this JavaScript code to dynamically embed the form. Place it where you want the form to appear.
                </p>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
                    <code>{jsCode}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2"
                    onClick={() => handleCopy(jsCode, "JavaScript")}
                  >
                    {copied ? (
                      <Check className="size-4 mr-2" />
                    ) : (
                      <Copy className="size-4 mr-2" />
                    )}
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Live Preview</CardTitle>
          <CardDescription>
            See how your form will look when embedded
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4 bg-gray-50">
            <iframe
              src={embedUrl}
              width={width}
              height={height}
              frameBorder="0"
              style={{
                border: "none",
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                maxWidth: "100%",
              }}
              title="Order Form Preview"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900">Integration Tips</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 space-y-2">
          <ul className="list-disc ml-4 space-y-1">
            <li>The form is fully responsive and will adapt to different screen sizes</li>
            <li>Orders submitted through the embedded form are automatically assigned to sales reps</li>
            <li>The form includes validation to ensure all required fields are filled</li>
            <li>Success/error messages are displayed within the iframe</li>
            <li>For best results, ensure the embed width is at least 320px</li>
            <li>The form works on all modern browsers including mobile</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
