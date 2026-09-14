import { notFound } from "next/navigation";
import { Archive, Clock, ExternalLink } from "lucide-react";
import { BackLink } from "@/components/back-link";
import { Button } from "@/components/ui/button";
import { ResourceBody } from "@/components/resources/resource-body";
import { ResourceDetailActions } from "@/components/resources/resource-detail-actions";
import { ResourceRatingControl } from "@/components/resources/resource-rating-control";
import { ResourceStars } from "@/components/resources/resource-stars";
import { ResourceTypeBadge } from "@/components/resources/resource-type-badge";
import { getResourceById } from "@/lib/data/resources-db";
import {
  isResourceCategoryId,
  RESOURCE_CATEGORIES,
} from "@/lib/data/resources";

export const dynamic = "force-dynamic";

export default async function ResourceTopicPage({
  params,
}: {
  params: Promise<{ categoryId: string; resourceId: string }>;
}) {
  const { categoryId, resourceId } = await params;
  if (!isResourceCategoryId(categoryId)) notFound();

  const resource = await getResourceById(resourceId);
  if (!resource || resource.categoryId !== categoryId) notFound();

  const category = RESOURCE_CATEGORIES.find((c) => c.id === categoryId)!;
  // Seed entries have no row behind them, so nothing that writes one is
  // offered for them — the same rule ResourceDetailActions follows.
  const editable = !resource.id.startsWith("seed-");
  const learnedOn = resource.archivedAt
    ? new Date(resource.archivedAt)
    : null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <div>
        <BackLink
          fallback={`/resources/${categoryId}`}
          label={category.title}
          className="-ml-2"
        />
      </div>

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <ResourceTypeBadge type={resource.type} />
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {resource.readMinutes} min read
          </span>
          {/* Archived is a state worth seeing at the top, not just a button
              label at the bottom: it is why this page is no longer in its
              category's gallery. */}
          {learnedOn && !Number.isNaN(learnedOn.getTime()) && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
              <Archive className="h-3.5 w-3.5" aria-hidden />
              Learned {learnedOn.toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          )}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          {resource.title}
        </h1>
        {resource.description && (
          <p className="max-w-prose text-muted-foreground">
            {resource.description}
          </p>
        )}
        {/* The one place a rating is *set*. Everywhere else shows it read-only,
            so there is a single writer and no form to remember to submit. */}
        <div className="flex items-center gap-3 pt-1">
          {editable ? (
            <ResourceRatingControl
              resourceId={resource.id}
              rating={resource.rating}
              className="-ml-1.5"
            />
          ) : (
            <ResourceStars rating={resource.rating} size="md" />
          )}
          <span className="text-xs text-muted-foreground">
            {resource.rating
              ? `${resource.rating} of 5`
              : editable
                ? "Not rated yet"
                : ""}
          </span>
        </div>
      </header>

      <ResourceBody resource={resource} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        {resource.url ? (
          <Button asChild variant="outline" size="sm">
            <a href={resource.url} target="_blank" rel="noreferrer noopener">
              <ExternalLink className="h-3.5 w-3.5" />
              Open in new tab
            </a>
          </Button>
        ) : (
          <span />
        )}
        <ResourceDetailActions resource={resource} />
      </div>
    </div>
  );
}
