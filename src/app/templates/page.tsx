import { TemplatesPageClient } from "@/components/templates/templates-page-client";
import { TEMPLATES } from "@/lib/data/templates";

export const dynamic = "force-dynamic";

export default function TemplatesPage() {
  return <TemplatesPageClient items={TEMPLATES} />;
}
