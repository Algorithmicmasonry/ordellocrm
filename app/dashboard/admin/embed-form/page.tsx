import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { EmbedCodeGenerator } from "./_components";

export default async function EmbedFormPage() {
  // Authentication check
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session || !session.user) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Embeddable Order Form</h1>
        <p className="text-muted-foreground mt-2">
          Embed the order form on your website, WordPress site, or Elementor page
        </p>
      </div>

      <EmbedCodeGenerator />
    </div>
  );
}
