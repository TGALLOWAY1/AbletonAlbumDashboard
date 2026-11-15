import { Target } from "lucide-react";
import { GoalsList } from "@/components/dashboard/widgets/goals-list";
import { WidgetBody, WidgetEmpty, WidgetHeader } from "@/components/dashboard/widget-parts";
import { trimSeriesToDays } from "@/lib/analytics";
import { fetchAnalyticsDataCached } from "@/lib/data/dashboard";
import { WIDGETS, type WidgetProps } from "@/lib/dashboard/widgets";

/** The longest window a goal can have is a calendar month. */
const LONGEST_PERIOD_DAYS = 31;

/**
 * Goals — targets for the week or the month, counted from what was logged.
 *
 * A goal is three settings on this widget and nothing else. There is no goals
 * table and nothing is incremented: progress is measured off the session and
 * task-completion series every time the card is drawn (`src/lib/goals.ts`),
 * so it cannot drift from the log and un-does itself when a session is
 * deleted. Which is also why the widget makes no query of its own — it reads
 * the series the heatmap and the weekly chart already asked for.
 */
export async function GoalsWidget({ config }: WidgetProps<"goals">) {
  const title = WIDGETS["goals"].name;

  if (config.goals.length === 0) {
    return (
      <>
        <WidgetHeader title={title} />
        <WidgetBody>
          <WidgetEmpty
            icon={Target}
            // Two rows tall there is room for the words or the icon, not both.
            className="[&>span]:hidden widget-h3:[&>span]:flex dash-stack:[&>span]:flex"
            title="No goals set"
            hint="Add one in this widget's settings: Customize, then its “…” menu."
          />
        </WidgetBody>
      </>
    );
  }

  const { sessions, taskCompletions } = await fetchAnalyticsDataCached();
  const now = new Date();

  return (
    <GoalsList
      title={title}
      goals={config.goals}
      sessions={trimSeriesToDays(sessions, (s) => s.startedAt, LONGEST_PERIOD_DAYS, now)}
      taskCompletions={trimSeriesToDays(
        taskCompletions,
        (t) => t.completedAt,
        LONGEST_PERIOD_DAYS,
        now,
      )}
    />
  );
}
