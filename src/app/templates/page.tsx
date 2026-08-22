import { TemplatesPageClient } from "@/components/templates/templates-page-client";
import { TEMPLATES } from "@/lib/data/templates";
import {
  DEFAULT_TEMPLATE_VIEW,
  parseViewPreference,
  type ViewSearchParams,
} from "@/lib/view-mode";

export const dynamic = "force-dynamic";

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<ViewSearchParams>;
}) {
  const params = await searchParams;
  const view = parseViewPreference(params, DEFAULT_TEMPLATE_VIEW);
  return <TemplatesPageClient items={TEMPLATES} view={view} />;
}
