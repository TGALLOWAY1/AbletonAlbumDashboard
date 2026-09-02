import { notFound } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { AddResourceDialog } from "@/components/resources/add-resource-dialog";
import { ResourceCategoryNav } from "@/components/resources/resource-category-nav";
import { ResourceGalleryView } from "@/components/resources/resource-gallery-view";
import { getResourceCategoryPageData } from "@/lib/data/resources-db";
import { isResourceCategoryId } from "@/lib/data/resources";
import { parseTagParam } from "@/lib/resource-tags";

export const dynamic = "force-dynamic";

export default async function ResourceCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ categoryId: string }>;
  searchParams: Promise<{ tag?: string | string[]; group?: string | string[] }>;
}) {
  const { categoryId } = await params;
  if (!isResourceCategoryId(categoryId)) notFound();

  const { tag, group } = await searchParams;
  const selectedTags = parseTagParam(tag);
  // `?group=tag` is the only grouping there is; anything else is the flat view.
  const groupByTag = (Array.isArray(group) ? group[0] : group) === "tag";

  const { category, topics } = await getResourceCategoryPageData(categoryId);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <BackLink fallback="/resources" label="Resources" className="-ml-2" />
      </div>

      <ResourceCategoryNav activeCategoryId={category.id} />

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {category.title}
          </h1>
          <p className="mt-1 max-w-prose text-muted-foreground">
            {category.description}
          </p>
        </div>
        {/* Adding from inside a category inherits it — no category picker. */}
        <AddResourceDialog
          categoryId={category.id}
          categoryTitle={category.title}
        />
      </header>

      <ResourceGalleryView
        topics={topics}
        basePath={`/resources/${category.id}`}
        selectedTags={selectedTags}
        groupByTag={groupByTag}
        showGroupToggle
        emptyMessage={`No topics in ${category.title} yet. Add the first one and it will lead the list.`}
      />
    </div>
  );
}
