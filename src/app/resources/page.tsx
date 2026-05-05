import { ResourcesPageClient } from "@/components/resources/resources-page-client";
import { getResourcesPageData } from "@/lib/data/resources-db";

export const dynamic = "force-dynamic";

export default async function ResourcesPage() {
  const { categories, featured, recent } = await getResourcesPageData();
  return (
    <ResourcesPageClient
      categories={categories}
      featured={featured}
      recent={recent}
    />
  );
}
