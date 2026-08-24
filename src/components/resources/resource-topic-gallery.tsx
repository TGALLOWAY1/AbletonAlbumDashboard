import type { ResourceItem } from "@/lib/data/resources";
import { ResourceTopicCard } from "./resource-topic-card";

/**
 * A topic and its number in the recommended order. The position is assigned
 * from the *unfiltered* list so a card keeps the same number when a search
 * narrows the gallery — renumbering 1..n on every keystroke would make the
 * ordering look like a result rank rather than a curated sequence.
 */
export type GalleryTopic = { resource: ResourceItem; position: number };

export function numberTopics(resources: ResourceItem[]): GalleryTopic[] {
  return resources.map((resource, index) => ({
    resource,
    position: index + 1,
  }));
}

/**
 * The one topic gallery, shared by /resources and every category page, so the
 * landing page and the category views are visibly the same system.
 */
export function ResourceTopicGallery({
  topics,
  emptyMessage,
}: {
  topics: GalleryTopic[];
  emptyMessage: string;
}) {
  if (topics.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-surface p-6 text-sm text-muted-foreground shadow-sm">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
      {topics.map(({ resource, position }) => (
        <ResourceTopicCard
          key={resource.id}
          resource={resource}
          position={position}
        />
      ))}
    </div>
  );
}
