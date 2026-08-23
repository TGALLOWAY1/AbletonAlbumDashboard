import { notFound } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { ResourceCategoryNav } from "@/components/resources/resource-category-nav";
import { ResourceTopicCard } from "@/components/resources/resource-topic-card";
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

      <header>
        <h1 className="text-3xl font-semibold tracking-tight">
          {category.title}
        </h1>
        <p className="mt-1 max-w-prose text-muted-foreground">
          {category.description}
        </p>
        <p className="mt-4 text-sm font-medium text-muted-foreground">
          {topics.length} topic{topics.length === 1 ? "" : "s"}
        </p>
      </header>

      {topics.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-6 text-sm text-muted-foreground shadow-sm">
          No topics in this category yet. Add a resource from the Resources
          page and it will show up here.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {topics.map((topic, index) => (
            <ResourceTopicCard
              key={topic.id}
              resource={topic}
              position={index + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
