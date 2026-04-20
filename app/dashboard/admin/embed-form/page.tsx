import { requireOrgContext } from "@/lib/org-context";
import { EmbedCodeGenerator } from "./_components";

export default async function EmbedFormPage() {
  await requireOrgContext();

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
