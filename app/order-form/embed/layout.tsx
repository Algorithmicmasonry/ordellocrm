import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Order Form - Ordo",
  description: "Place your order",
}

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="bg-gray-50 w-full">
      {children}
    </div>
  )
}
