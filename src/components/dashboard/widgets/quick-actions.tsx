import { QuickActionsTiles } from "@/components/dashboard/widgets/quick-actions-tiles";
import { WidgetBody, WidgetHeader } from "@/components/dashboard/widget-parts";
import {
  QUICK_ACTION_KEYS,
  WIDGETS,
  type WidgetProps,
} from "@/lib/dashboard/widgets";
import { getSessionTypesCached, listTrackOptionsCached } from "@/lib/data/dashboard";

/**
 * The shortcuts that used to be the home page's header row — start a
 * session, log one, add a track — plus jotting a studio task, as tiles.
 *
 * Which ones show is the widget's setting; their order is the registry's, so
 * a tile never moves because of the order its box was ticked in. The settings
 * schema guarantees at least one, so there is no empty state to draw.
 *
 * The card has a title only where it has the height for one. Two rows tall,
 * or stacked on a phone — where this widget is first and every line above
 * the shortlist counts — the title is kept for screen readers and the tiles
 * take the whole box: the labels already say what they are.
 */
export async function QuickActionsWidget({ config }: WidgetProps<"quick-actions">) {
  const actions = QUICK_ACTION_KEYS.filter((key) => config.actions.includes(key));

  // Only "Log session" reads anything: its dialog picks from the tracks and
  // the session types. With that shortcut off, the widget makes no query.
  const logging = actions.includes("log-session");
  const [tracks, sessionTypes] = logging
    ? await Promise.all([listTrackOptionsCached(), getSessionTypesCached()])
    : [[], []];

  return (
    <>
      <div className="sr-only shrink-0 widget-h3:not-sr-only">
        <WidgetHeader title={WIDGETS["quick-actions"].name} />
      </div>
      <WidgetBody
        scroll={false}
        className="pt-4 widget-h3:pt-0 dash-stack:p-2.5"
      >
        <QuickActionsTiles
          actions={actions}
          tracks={tracks.map((t) => ({ id: t.id, name: t.name, status: t.status }))}
          sessionTypes={sessionTypes}
        />
      </WidgetBody>
    </>
  );
}
