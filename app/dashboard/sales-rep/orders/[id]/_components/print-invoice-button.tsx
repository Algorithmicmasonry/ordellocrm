"use client";

import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { getCurrencySymbol } from "@/lib/currency";
import type { Order, OrderItem, Product, Agent } from "@prisma/client";
import { format } from "date-fns";

interface PrintInvoiceButtonProps {
  order: Order & {
    items: (OrderItem & { product: Product })[];
    agent?: Agent | null;
  };
}

export function PrintInvoiceButton({ order }: PrintInvoiceButtonProps) {
  const getInvoiceHTML = () => {
    const totalAmount = order.items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0,
    );

    const storeName = process.env.NEXT_PUBLIC_STORE_NAME || "Ordo Store";
    const currencySymbol = getCurrencySymbol(order.currency);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${order.orderNumber}</title>
          <meta charset="UTF-8">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Arial', sans-serif;
              padding: 40px;
              color: #333;
            }
            .invoice-header {
              display: flex;
              justify-content: space-between;
              align-items: start;
              margin-bottom: 40px;
              padding-bottom: 20px;
              border-bottom: 2px solid #eee;
            }
            .company-info h1 {
              font-size: 28px;
              margin-bottom: 5px;
              color: #000;
            }
            .company-info p {
              color: #666;
              font-size: 14px;
            }
            .invoice-details {
              text-align: right;
            }
            .invoice-details h2 {
              font-size: 24px;
              margin-bottom: 10px;
            }
            .invoice-details p {
              font-size: 14px;
              color: #666;
            }
            .section {
              margin-bottom: 30px;
            }
            .section-title {
              font-size: 14px;
              font-weight: bold;
              text-transform: uppercase;
              color: #666;
              margin-bottom: 10px;
            }
            .customer-details, .order-details {
              background: #f9f9f9;
              padding: 20px;
              border-radius: 8px;
            }
            .customer-details p, .order-details p {
              margin-bottom: 8px;
              font-size: 14px;
            }
            .customer-details strong, .order-details strong {
              color: #000;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            th {
              background: #333;
              color: white;
              padding: 12px;
              text-align: left;
              font-size: 13px;
              text-transform: uppercase;
            }
            th:last-child, td:last-child {
              text-align: right;
            }
            td {
              padding: 12px;
              border-bottom: 1px solid #eee;
              font-size: 14px;
            }
            tr:last-child td {
              border-bottom: none;
            }
            .total-row {
              background: #f9f9f9;
              font-weight: bold;
              font-size: 16px;
            }
            .total-row td {
              padding: 16px 12px;
            }
            .footer {
              margin-top: 50px;
              text-align: center;
              color: #666;
              font-size: 12px;
              padding-top: 20px;
              border-top: 1px solid #eee;
            }
            @media print {
              body {
                padding: 20px;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="invoice-header">
            <div class="company-info">
              <h1>${storeName}</h1>
              <p>Order Management System</p>
            </div>
            <div class="invoice-details">
              <h2>INVOICE</h2>
              <p><strong>Order #:</strong> ${order.orderNumber}</p>
              <p><strong>Date:</strong> ${format(new Date(order.createdAt), "MMM dd, yyyy")}</p>
              <p><strong>Status:</strong> ${order.status}</p>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Customer Information</div>
            <div class="customer-details">
              <p><strong>Name:</strong> ${order.customerName}</p>
              <p><strong>Phone:</strong> ${order.customerPhone}</p>
              ${order.customerWhatsapp ? `<p><strong>WhatsApp:</strong> ${order.customerWhatsapp}</p>` : ""}
              <p><strong>Address:</strong> ${order.deliveryAddress}</p>
              <p><strong>Location:</strong> ${order.city}, ${order.state}</p>
            </div>
          </div>

          ${
            order.agent
              ? `
          <div class="section">
            <div class="section-title">Delivery Information</div>
            <div class="order-details" style="background: #e3f2fd; border-left: 4px solid #2196F3;">
              <p><strong>Delivery Agent:</strong> ${order.agent.name}</p>
              <p><strong>Agent Phone:</strong> ${order.agent.phone}</p>
              <p><strong>Agent Location:</strong> ${order.agent.location}</p>
              ${order.deliverySlot ? `<p><strong>Delivery Slot:</strong> ${order.deliverySlot.charAt(0).toUpperCase() + order.deliverySlot.slice(1)}</p>` : ""}
              ${order.dispatchedAt ? `<p><strong>Dispatch Date:</strong> ${format(new Date(order.dispatchedAt), "MMM dd, yyyy h:mm a")}</p>` : ""}
            </div>
          </div>
          `
              : ""
          }

          <div class="section">
            <div class="section-title">Order Items</div>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${order.items
                  .map(
                    (item) => `
                  <tr>
                    <td>${item.product.name}</td>
                    <td>${item.quantity}</td>
                    <td>${currencySymbol}${item.price.toLocaleString()}</td>
                    <td>${currencySymbol}${(item.quantity * item.price).toLocaleString()}</td>
                  </tr>
                `,
                  )
                  .join("")}
                <tr class="total-row">
                  <td colspan="3">Total Amount</td>
                  <td>${currencySymbol}${totalAmount.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          ${
            order.confirmedAt
              ? `
          <div class="section">
            <div class="section-title">Order Timeline</div>
            <div class="order-details">
              ${order.confirmedAt ? `<p><strong>Confirmed:</strong> ${format(new Date(order.confirmedAt), "MMM dd, yyyy h:mm a")}</p>` : ""}
              ${order.dispatchedAt ? `<p><strong>Dispatched:</strong> ${format(new Date(order.dispatchedAt), "MMM dd, yyyy h:mm a")}</p>` : ""}
              ${order.deliveredAt ? `<p><strong>Delivered:</strong> ${format(new Date(order.deliveredAt), "MMM dd, yyyy h:mm a")}</p>` : ""}
              ${order.cancelledAt ? `<p><strong>Cancelled:</strong> ${format(new Date(order.cancelledAt), "MMM dd, yyyy h:mm a")}</p>` : ""}
            </div>
          </div>
          `
              : ""
          }

          <div class="footer">
            <p>Thank you for your business!</p>
            <p>This is a computer-generated invoice.</p>
          </div>
        </body>
      </html>
    `;
  };

  const handlePrint = () => {
    const printContent = getInvoiceHTML();

    // Open print window
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();

      // Wait for content to load then print
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const handleDownload = () => {
    const htmlContent = getInvoiceHTML();

    // Create a Blob from the HTML content
    const blob = new Blob([htmlContent], { type: "text/html" });

    // Create a download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Invoice-${order.orderNumber}-${format(new Date(), "yyyy-MM-dd")}.html`;

    // Trigger download
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={handlePrint}>
        <Printer className="size-4 mr-2" />
        Print Invoice
      </Button>
      <Button variant="outline" onClick={handleDownload}>
        <Download className="size-4 mr-2" />
        Download Invoice
      </Button>
    </div>
  );
}
