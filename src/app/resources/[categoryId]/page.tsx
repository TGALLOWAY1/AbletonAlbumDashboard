import { notFound } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { AddResourceDialog } from "@/components/resources/add-resource-dialog";
import { ResourceCategoryNav } from "@/components/resources/resource-category-nav";
import {
  numberTopics,
  ResourceTopicGallery,
} from "@/components/resources/resource-topic-gallery";
import { getResourceCategoryPageData } from "@/lib/data/resources-db";
import { isResourceCategoryId } from "@/lib/data/resources";

export const dynamic = "force-dynamic";

export default async function ResourceCategoryPage({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const { categoryId } = await params;
  if (!isResourceCategoryId(categoryId)) notFound();

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

      <p className="text-sm font-medium text-muted-foreground">
        {topics.length} topic{topics.length === 1 ? "" : "s"}
      </p>

      <ResourceTopicGallery
        topics={numberTopics(topics)}
        emptyMessage={`No topics in ${category.title} yet. Add the first one and it will lead the list.`}
      />
    </div>
  );
}
