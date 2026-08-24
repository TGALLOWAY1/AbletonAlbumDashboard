import { ResourcesPageClient } from "@/components/resources/resources-page-client";
import { getResourcesGalleryData } from "@/lib/data/resources-db";

export const dynamic = "force-dynamic";

export default async function ResourcesPage() {
  const { topics } = await getResourcesGalleryData();
  return <ResourcesPageClient topics={topics} />;
}
