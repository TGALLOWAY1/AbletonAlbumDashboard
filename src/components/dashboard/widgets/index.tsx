import type { ReactNode } from "react";
import { CurrentTrackWidget } from "@/components/dashboard/widgets/current-track";
import { PinnedTracksWidget } from "@/components/dashboard/widgets/pinned-tracks";
import { SunoQueueWidget } from "@/components/dashboard/widgets/suno-queue";
import { TasksWidget } from "@/components/dashboard/widgets/tasks";
import { QuickActionsWidget } from "@/components/dashboard/widgets/quick-actions";
import { FocusTimerWidget } from "@/components/dashboard/widgets/focus-timer";
import { WorkHeatmapWidget } from "@/components/dashboard/widgets/work-heatmap";
import { ProgressOverviewWidget } from "@/components/dashboard/widgets/progress-overview";
import { RecentSessionsWidget } from "@/components/dashboard/widgets/recent-sessions";
import { WeeklyActivityWidget } from "@/components/dashboard/widgets/weekly-activity";
import { GoalsWidget } from "@/components/dashboard/widgets/goals";
import type { WidgetProps, WidgetType } from "@/lib/dashboard/widgets";

/**
 * The component that draws each widget type.
 *
 * The other half of the registry in `src/lib/dashboard/widgets.ts`: that file
 * says what a widget is, this one says how it renders. They are separate
 * because these are server components and the registry has to be importable
 * from the browser. The mapped type below makes the pairing a compile-time
 * fact — a type defined there and missing here does not build, and each
 * component is checked against its own widget's settings.
 */
export const WIDGET_RENDERERS: {
  [T in WidgetType]: (props: WidgetProps<T>) => ReactNode | Promise<ReactNode>;
} = {
  "current-track": CurrentTrackWidget,
  "pinned-tracks": PinnedTracksWidget,
  "suno-queue": SunoQueueWidget,
  "tasks": TasksWidget,
  "quick-actions": QuickActionsWidget,
  "focus-timer": FocusTimerWidget,
  "work-heatmap": WorkHeatmapWidget,
  "progress-overview": ProgressOverviewWidget,
  "recent-sessions": RecentSessionsWidget,
  "weekly-activity": WeeklyActivityWidget,
  "goals": GoalsWidget,
};
