"use server";

import type { ReactNode } from "react";
import { WidgetHost } from "@/components/dashboard/widget-host";
import { resolveWidgetType } from "@/lib/dashboard/widgets";

/**
 * Render one widget on demand, for the dashboard's edit mode.
 *
 * Widgets are server components, and the page renders one per instance *in
 * the saved layout*. A widget added, duplicated or re-configured while
 * customizing is not in the saved layout yet — and should not be, since the
 * edit can still be cancelled — so the page has no node for it. This returns
 * that node: the same `WidgetHost` the page would render, with live data, for
 * a type and settings that exist only in the browser's draft.
 *
 * It reads and writes nothing of its own and revalidates nothing; it is a
 * render, exposed as an action because that is how a client component asks
 * the server for a piece of UI. The type and settings are validated exactly
 * as a saved layout's are (`resolveWidgetType`, then `readWidgetConfig`
 * inside the host), so the browser cannot ask for anything a saved layout
 * could not contain.
 */
export async function renderWidgetPreview(input: {
  type: string;
  config: unknown;
  instanceId: string;
}): Promise<ReactNode> {
  const type = resolveWidgetType(input.type);
  if (!type) return null;
  return (
    <WidgetHost
      type={type}
      config={input.config}
      instanceId={String(input.instanceId).slice(0, 64)}
    />
  );
}
