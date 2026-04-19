/**
 * Utility functions for exporting data to various formats (CSV, PDF, etc.)
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Export data to CSV format
 * @param headers - Array of column headers
 * @param rows - Array of data rows (each row is an array of values)
 * @param filename - Name of the file to download (without extension)
 */
export function exportToCSV(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][],
  filename: string,
): void {
  // Escape and format CSV cells
  const escapeCsvCell = (cell: string | number | boolean | null | undefined): string => {
    const value = cell?.toString() ?? "";
    // Escape double quotes by doubling them and wrap in quotes if contains comma, quote, or newline
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  // Combine headers and rows
  const csvContent = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ].join("\n");

  // Create and download file
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the URL object
  URL.revokeObjectURL(url);
}

/**
 * Generate a standardized filename with current date
 * @param prefix - Prefix for the filename (e.g., "orders", "expenses")
 * @returns Filename in format: prefix_YYYY-MM-DD
 */
export function generateFilename(prefix: string): string {
  const date = new Date().toISOString().split("T")[0];
  return `${prefix}_${date}`;
}

/**
 * Export data to JSON format
 * @param data - Data object or array to export
 * @param filename - Name of the file to download (without extension)
 */
export function exportToJSON(
  data: unknown,
  filename: string,
): void {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.json`);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Format currency for export (handles multiple currencies)
 */
export function formatCurrencyForExport(amount: number, currency?: string): string {
  if (currency === "USD") {
    return `$${amount.toFixed(2)}`;
  }
  return `${currency || "NGN"} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format date for export
 */
export function formatDateForExport(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format date only (without time) for export
 */
export function formatDateOnlyForExport(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Export data to PDF format with table
 * @param title - Document title
 * @param headers - Array of column headers
 * @param rows - Array of data rows (each row is an array of values)
 * @param filename - Name of the file to download (without extension)
 * @param options - Optional configuration for the PDF
 */
export function exportToPDF(
  title: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][],
  filename: string,
  options?: {
    orientation?: "portrait" | "landscape";
    subtitle?: string;
    metadata?: Array<{ label: string; value: string }>;
  },
): void {
  const doc = new jsPDF({
    orientation: options?.orientation || "portrait",
    unit: "mm",
    format: "a4",
  });

  // Add title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 20);

  let currentY = 30;

  // Add subtitle if provided
  if (options?.subtitle) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(options.subtitle, 14, currentY);
    currentY += 10;
  }

  // Add metadata if provided
  if (options?.metadata && options.metadata.length > 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    options.metadata.forEach((item) => {
      doc.text(`${item.label}: ${item.value}`, 14, currentY);
      currentY += 6;
    });
    currentY += 5;
  }

  // Add table
  autoTable(doc, {
    head: [headers],
    body: rows.map((row) => row.map((cell) => cell?.toString() ?? "")),
    startY: currentY,
    theme: "grid",
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [71, 85, 105], // slate-600
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
    margin: { top: currentY, left: 14, right: 14 },
  });

  // Add footer with date and page numbers
  const pageCount = doc.getNumberOfPages();
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(
      `Generated on ${new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })}`,
      14,
      doc.internal.pageSize.height - 10,
    );
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.width - 30,
      doc.internal.pageSize.height - 10,
    );
  }

  // Save the PDF
  doc.save(`${filename}.pdf`);
}
