import { Suspense } from "react";
import { WidgetErrorBoundary } from "@/components/dashboard/widget-error-boundary";
import { WidgetSkeleton } from "@/components/dashboard/widget-parts";
import { WIDGET_RENDERERS } from "@/components/dashboard/widgets";
import {
  readWidgetConfig,
  widgetDefinition,
  type WidgetType,
} from "@/lib/dashboard/widgets";

/**
 * One widget instance, rendered on the server.
 *
 * The page builds one of these per instance in the layout and hands them to
 * the client shell as already-rendered nodes — the trick `PinnedTracks` uses
 * for its expanded card. That is what lets the shell be a client component
 * (it holds the drag and edit state) without the widgets, and everything
 * they import, joining the browser bundle; and what lets each widget be an
 * async server component that reads exactly the data it draws.
 *
 * Every widget gets the same three states for free: a skeleton while its data
 * streams in (Suspense), its own content, and a contained failure card
 * (`WidgetErrorBoundary`). A widget never has to write any of that.
 */
export function WidgetHost({
  type,
  config,
  instanceId,
}: {
  type: WidgetType;
  config: unknown;
  instanceId: string;
}) {
  const definition = widgetDefinition(type);
  const Renderer = WIDGET_RENDERERS[type] as (props: {
    config: Record<string, unknown>;
    instanceId: string;
  }) => React.ReactNode | Promise<React.ReactNode>;

  return (
    <WidgetErrorBoundary name={definition.name}>
      <Suspense fallback={<WidgetSkeleton name={definition.name} />}>
        <Renderer config={readWidgetConfig(type, config)} instanceId={instanceId} />
      </Suspense>
    </WidgetErrorBoundary>
  );
}
