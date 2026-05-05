import { notFound } from "next/navigation";
import { TEMPLATES } from "@/lib/data/templates";
import { TemplatePageView } from "@/components/templates/template-page-view";

export const dynamic = "force-dynamic";

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = TEMPLATES.find((t) => t.id === id);
  if (!template) notFound();
  return <TemplatePageView template={template} />;
}
