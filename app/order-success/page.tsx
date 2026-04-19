import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import Link from "next/link"; // Assuming Next.js Link component

export default function OrderSuccessPage() {
  return (
    <div
      className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900"
      style={{ colorScheme: "light" }}
    >
      <Card className="w-full max-w-md p-6 text-center shadow-lg">
        <CardHeader className="flex flex-col items-center justify-center space-y-4">
          <CheckCircle className="h-20 w-20 text-green-500 animate-bounce" />
          <CardTitle className="text-4xl font-extrabold text-gray-900 dark:text-gray-100">
            Order Confirmed!
          </CardTitle>
          <CardDescription className="text-lg text-gray-600 dark:text-gray-400">
            Your order has been placed successfully and is now being processed.
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-6 space-y-4">
          <p className="text-md text-gray-700 dark:text-gray-300">
            Thank you for your purchase! A Sales rep will reach out to you
            shortly.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
