import { ResourcesPageClient } from "@/components/resources/resources-page-client";
import { getResourcesGalleryData } from "@/lib/data/resources-db";
import { parseTagParam } from "@/lib/resource-tags";

export const dynamic = "force-dynamic";

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string | string[] }>;
}) {
  const { tag } = await searchParams;
  const { topics } = await getResourcesGalleryData();
  return (
    <ResourcesPageClient topics={topics} selectedTags={parseTagParam(tag)} />
  );
}
