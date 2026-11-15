import { z } from "zod";
import {
  Activity,
  BarChart3,
  CalendarDays,
  Clock,
  Disc3,
  History,
  ListTodo,
  Pin,
  Sparkles,
  Target,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { RangeKey } from "@/lib/analytics";
import type { GridBounds } from "@/lib/dashboard/grid";

/**
 * The widget registry — what a widget *is*, with nothing about how it draws.
 *
 * Everything the dashboard needs to know about a kind of widget without
 * rendering one lives here: its name and blurb for the gallery, the sizes it
 * offers, how small it may be dragged, whether a second copy makes sense, and
 * the shape of its settings. It is plain data plus Zod schemas, so the gallery
 * and the edit controls (client), the save action (server) and the layout
 * parser (both, and unit tests) all read one definition.
 *
 * The component that actually draws a widget is registered separately, in
 * `src/components/dashboard/widgets/index.tsx`, because those are server
 * components and this file must stay importable from the browser. The two
 * are held in step by the type system: that map is a
 * `Record<WidgetType, …>`, so a widget defined here with no renderer there is
 * a compile error, not a blank card.
 *
 * ADDING A WIDGET
 *   1. Add an entry to `WIDGETS` below.
 *   2. Write its component and add it to the renderer map.
 * Nothing in the grid, the gallery, the settings dialog or the persistence
 * layer needs to change — they all iterate this registry.
 */

// ---------------------------------------------------------------- sizes ----

/**
 * The named sizes, in grid cells (columns × rows on the 12-column grid).
 *
 * A widget can be dragged to any size its bounds allow; these are the
 * one-click presets and the vocabulary the gallery uses to say what a widget
 * comes in. They are sizes of the *box* — what a widget shows at each one is
 * its own business, decided with container queries against the box it is
 * actually in (see `widget-parts.tsx`).
 */
export const WIDGET_SIZES = {
  small: { w: 3, h: 2, label: "Small", blurb: "A figure or a shortcut" },
  medium: { w: 3, h: 4, label: "Medium", blurb: "A summary you can act on" },
  wide: { w: 6, h: 3, label: "Wide", blurb: "A featured strip" },
  large: { w: 6, h: 5, label: "Large", blurb: "The full picture" },
} as const;

export type WidgetSizeKey = keyof typeof WIDGET_SIZES;

export const WIDGET_SIZE_KEYS = Object.keys(WIDGET_SIZES) as WidgetSizeKey[];

// ----------------------------------------------------------- categories ----

export const WIDGET_CATEGORIES = [
  { id: "tracks", label: "Tracks" },
  { id: "work", label: "Tasks & focus" },
  { id: "progress", label: "Progress" },
] as const;

export type WidgetCategory = (typeof WIDGET_CATEGORIES)[number]["id"];

// ------------------------------------------------------ settings fields ----

/**
 * How a setting is edited. The settings dialog draws a form from these, so a
 * widget describes its options instead of shipping its own dialog. `goals` is
 * the one bespoke editor; everything else is a generic control.
 */
export type ConfigField =
  | {
      kind: "select";
      key: string;
      label: string;
      options: readonly { value: string | number; label: string }[];
    }
  | {
      kind: "track";
      key: string;
      label: string;
      /** What choosing no track means for this widget. */
      noneLabel: string;
    }
  | {
      kind: "checks";
      key: string;
      label: string;
      options: readonly { value: string; label: string }[];
    }
  | { kind: "goals"; key: string; label: string };

// --------------------------------------------------------- shared enums ----

const RANGE_KEYS = ["7d", "30d", "3m", "6m", "1y"] as const satisfies readonly RangeKey[];

const RANGE_FIELD_OPTIONS = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "3m", label: "Last 3 months" },
  { value: "6m", label: "Last 6 months" },
  { value: "1y", label: "Last year" },
] as const;

export const QUICK_ACTION_KEYS = [
  "start-session",
  "log-session",
  "add-track",
  "add-task",
] as const;
export type QuickActionKey = (typeof QUICK_ACTION_KEYS)[number];

export const QUICK_ACTION_LABELS: Record<QuickActionKey, string> = {
  "start-session": "Start session",
  "log-session": "Log session",
  "add-track": "Add track",
  "add-task": "Add task",
};

/** Focus-timer presets, in minutes. 0 is an open-ended session (count up). */
export const FOCUS_PRESET_MINUTES = [0, 15, 25, 45, 60, 90] as const;

/**
 * A goal is a target over a window, measured from records that already exist.
 *
 * There is no goals table and nothing increments: "3 sessions this week" is
 * counted off `sessions` every time it is drawn, the same way the learned
 * figure on /resources is a `count(...)` rather than a tally. A stored counter
 * cannot be un-done when a session is deleted; a derived one cannot be wrong.
 */
export const GOAL_METRICS = ["sessions", "minutes", "tasks", "days"] as const;
export type GoalMetric = (typeof GOAL_METRICS)[number];

export const GOAL_METRIC_LABELS: Record<GoalMetric, string> = {
  sessions: "Sessions",
  minutes: "Minutes of work",
  tasks: "Tasks done",
  days: "Days worked",
};

export const GOAL_PERIODS = ["week", "month"] as const;
export type GoalPeriod = (typeof GOAL_PERIODS)[number];

export const MAX_GOALS = 5;

export const goalSchema = z.object({
  metric: z.enum(GOAL_METRICS),
  target: z.number().int().min(1).max(100_000),
  period: z.enum(GOAL_PERIODS),
});
export type Goal = z.infer<typeof goalSchema>;

const trackIdSchema = z.string().uuid().nullable();

// ------------------------------------------------------------ registry ----

type WidgetDefinition<C> = {
  /** What it is called everywhere a person reads it. */
  name: string;
  /** One sentence for the gallery: what it is for, not how it is built. */
  description: string;
  category: WidgetCategory;
  icon: LucideIcon;
  /** The presets offered, smallest first. The first is also the minimum box. */
  sizes: readonly WidgetSizeKey[];
  defaultSize: WidgetSizeKey;
  /**
   * Whether a second copy is meaningful. True for widgets whose settings make
   * each copy different (a task list per track); false where every copy would
   * show the same thing (there is one shortlist and one running timer).
   */
  multiple: boolean;
  config: z.ZodType<C>;
  defaultConfig: C;
  fields: readonly ConfigField[];
};

function define<C>(definition: WidgetDefinition<C>): WidgetDefinition<C> {
  return definition;
}

const noConfig = z.object({});

export const WIDGETS = {
  "current-track": define({
    name: "Current Track",
    description:
      "The song you are on right now — how far along it is, what is next, and one tap to start working.",
    category: "tracks",
    icon: Disc3,
    sizes: ["small", "medium", "wide", "large"],
    defaultSize: "wide",
    multiple: true,
    config: z.object({ trackId: trackIdSchema }),
    defaultConfig: { trackId: null },
    fields: [
      {
        kind: "track",
        key: "trackId",
        label: "Track",
        noneLabel: "Top of the pinned shortlist",
      },
    ],
  }),
  "pinned-tracks": define({
    name: "Pinned Tracks",
    description:
      "Your shortlist of up to five tracks, in the priority order you drag them into.",
    category: "tracks",
    icon: Pin,
    sizes: ["medium", "wide", "large"],
    defaultSize: "medium",
    multiple: false,
    config: noConfig,
    defaultConfig: {},
    fields: [],
  }),
  "suno-queue": define({
    name: "Suno Round-trips",
    description:
      "Open Suno experiments by where they are stuck: ready to send, waiting, to review, to integrate.",
    category: "tracks",
    icon: Sparkles,
    sizes: ["small", "wide"],
    defaultSize: "wide",
    multiple: false,
    config: noConfig,
    defaultConfig: {},
    fields: [],
  }),
  tasks: define({
    name: "Tasks",
    description:
      "A task list you can add to, tick off and reorder — the studio's chores, or one track's remaining work.",
    category: "work",
    icon: ListTodo,
    sizes: ["medium", "wide", "large"],
    defaultSize: "medium",
    multiple: true,
    config: z.object({ trackId: trackIdSchema }),
    defaultConfig: { trackId: null },
    fields: [
      {
        kind: "track",
        key: "trackId",
        label: "List",
        noneLabel: "Studio tasks",
      },
    ],
  }),
  "quick-actions": define({
    name: "Quick Actions",
    description:
      "Shortcuts for the things you do most: start a session, log one, add a track, jot a task.",
    category: "work",
    icon: Zap,
    sizes: ["small", "medium", "wide"],
    defaultSize: "small",
    multiple: false,
    config: z.object({
      actions: z.array(z.enum(QUICK_ACTION_KEYS)).min(1).max(QUICK_ACTION_KEYS.length),
    }),
    defaultConfig: { actions: [...QUICK_ACTION_KEYS] as QuickActionKey[] },
    fields: [
      {
        kind: "checks",
        key: "actions",
        label: "Shortcuts shown",
        options: QUICK_ACTION_KEYS.map((key) => ({
          value: key,
          label: QUICK_ACTION_LABELS[key],
        })),
      },
    ],
  }),
  "focus-timer": define({
    name: "Focus Timer",
    description:
      "Run a timed session on a track without leaving the dashboard, then log it the usual way.",
    category: "work",
    icon: Clock,
    sizes: ["small", "medium", "large"],
    defaultSize: "medium",
    multiple: false,
    config: z.object({ minutes: z.number().int().min(0).max(240) }),
    defaultConfig: { minutes: 25 },
    fields: [
      {
        kind: "select",
        key: "minutes",
        label: "Default length",
        options: FOCUS_PRESET_MINUTES.map((m) => ({
          value: m,
          label: m === 0 ? "Open-ended" : `${m} minutes`,
        })),
      },
    ],
  }),
  "work-heatmap": define({
    name: "Work Heatmap",
    description:
      "Every day you worked, shaded by how long — a week, a month or a year at a glance.",
    category: "progress",
    icon: CalendarDays,
    sizes: ["medium", "wide", "large"],
    defaultSize: "wide",
    multiple: true,
    config: z.object({ range: z.enum(RANGE_KEYS) }),
    defaultConfig: { range: "30d" as RangeKey },
    fields: [
      { kind: "select", key: "range", label: "Opens on", options: RANGE_FIELD_OPTIONS },
    ],
  }),
  "progress-overview": define({
    name: "Progress Overview",
    description:
      "How finished your active tracks are, with tasks done, time logged and days worked beside it.",
    category: "progress",
    icon: Activity,
    sizes: ["small", "medium", "wide"],
    defaultSize: "medium",
    multiple: true,
    config: z.object({ range: z.enum(RANGE_KEYS) }),
    defaultConfig: { range: "30d" as RangeKey },
    fields: [
      { kind: "select", key: "range", label: "Measured over", options: RANGE_FIELD_OPTIONS },
    ],
  }),
  "recent-sessions": define({
    name: "Recent Sessions",
    description:
      "The last few sessions you logged — what you worked on, for how long, and when.",
    category: "progress",
    icon: History,
    sizes: ["medium", "wide", "large"],
    defaultSize: "wide",
    multiple: false,
    config: z.object({ limit: z.number().int().min(3).max(25) }),
    defaultConfig: { limit: 5 },
    fields: [
      {
        kind: "select",
        key: "limit",
        label: "Sessions listed",
        options: [
          { value: 5, label: "5" },
          { value: 10, label: "10" },
          { value: 20, label: "20" },
        ],
      },
    ],
  }),
  "weekly-activity": define({
    name: "This Week",
    description: "Time logged on each day of the current week, Monday to Sunday.",
    category: "progress",
    icon: BarChart3,
    sizes: ["small", "medium", "wide"],
    defaultSize: "medium",
    multiple: false,
    config: noConfig,
    defaultConfig: {},
    fields: [],
  }),
  goals: define({
    name: "Goals",
    description:
      "Targets for the week or month — sessions, time, tasks, days worked — counted from what you actually logged.",
    category: "progress",
    icon: Target,
    sizes: ["small", "medium", "wide"],
    defaultSize: "medium",
    multiple: true,
    config: z.object({ goals: z.array(goalSchema).max(MAX_GOALS) }),
    defaultConfig: {
      goals: [
        { metric: "sessions", target: 3, period: "week" },
        { metric: "minutes", target: 180, period: "week" },
        { metric: "tasks", target: 5, period: "week" },
      ] as Goal[],
    },
    fields: [{ kind: "goals", key: "goals", label: "Goals" }],
  }),
} as const;

export type WidgetType = keyof typeof WIDGETS;

export type WidgetConfig<T extends WidgetType> = z.infer<(typeof WIDGETS)[T]["config"]>;

/** What every widget component receives. */
export type WidgetProps<T extends WidgetType> = {
  /** This copy's settings, already validated against the widget's schema. */
  config: WidgetConfig<T>;
  /** Stable id of this copy on the dashboard — unique where the type is not. */
  instanceId: string;
};

export const WIDGET_TYPES = Object.keys(WIDGETS) as WidgetType[];

/**
 * Types that used to exist under another name. A saved layout is data the
 * code cannot migrate in place, so a rename is recorded here and old layouts
 * keep working; a type that is neither current nor listed is dropped when the
 * layout is read (see `readLayout`).
 */
export const WIDGET_TYPE_ALIASES: Record<string, WidgetType> = {};

export function resolveWidgetType(raw: unknown): WidgetType | null {
  if (typeof raw !== "string") return null;
  if (Object.hasOwn(WIDGETS, raw)) return raw as WidgetType;
  return Object.hasOwn(WIDGET_TYPE_ALIASES, raw) ? WIDGET_TYPE_ALIASES[raw] : null;
}

/** The definition, widened so callers can treat every widget alike. */
export function widgetDefinition(type: WidgetType): WidgetDefinition<unknown> {
  return WIDGETS[type] as WidgetDefinition<unknown>;
}

/**
 * A widget's settings as stored, made safe to use. Anything that does not
 * match the schema — a shape from an older version, a hand-edited row — reads
 * back as the widget's defaults, so a bad setting costs a preference and
 * never a render.
 */
export function readWidgetConfig(type: WidgetType, raw: unknown): Record<string, unknown> {
  const definition = widgetDefinition(type);
  const parsed = definition.config.safeParse(raw);
  return (parsed.success ? parsed.data : definition.defaultConfig) as Record<string, unknown>;
}

/** The smallest box a widget may be: the least width and least height among its presets. */
export function widgetBounds(type: WidgetType): GridBounds {
  const sizes = widgetDefinition(type).sizes.map((key) => WIDGET_SIZES[key]);
  return {
    minW: Math.min(...sizes.map((s) => s.w)),
    minH: Math.min(...sizes.map((s) => s.h)),
  };
}

/** Which preset, if any, a box currently matches — for ticking the size menu. */
export function matchingSize(type: WidgetType, w: number, h: number): WidgetSizeKey | null {
  return (
    widgetDefinition(type).sizes.find(
      (key) => WIDGET_SIZES[key].w === w && WIDGET_SIZES[key].h === h,
    ) ?? null
  );
}
