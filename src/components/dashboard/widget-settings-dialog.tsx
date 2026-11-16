"use client";

import { useId, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/toast";
import type { LayoutItem } from "@/lib/dashboard/layout";
import {
  GOAL_METRICS,
  GOAL_METRIC_LABELS,
  GOAL_PERIODS,
  MAX_GOALS,
  widgetDefinition,
  type ConfigField,
  type Goal,
  type GoalMetric,
  type GoalPeriod,
} from "@/lib/dashboard/widgets";

/** A track, as much as a settings picker needs of one. */
export type SettingsTrack = { id: string; name: string };

const FIELD_CLASS =
  "h-10 w-full min-w-0 rounded-md border border-border bg-surface-2 px-3 text-sm text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

const PERIOD_LABELS: Record<GoalPeriod, string> = {
  week: "a week",
  month: "a month",
};

/**
 * Settings for one widget instance.
 *
 * The form is generated from the widget's `fields` in the registry, so a
 * widget describes its options and never ships a dialog of its own. What the
 * user edits is a draft; "Done" validates it against the widget's schema and
 * hands it back — into the dashboard's *edit* draft, not the database, so a
 * settings change is saved or cancelled along with everything else changed in
 * that edit.
 *
 * Mounted only while open, keyed by instance, so the draft always starts from
 * the instance's current settings.
 */
export function WidgetSettingsDialog({
  item,
  tracks,
  onClose,
  onSave,
}: {
  item: LayoutItem;
  tracks: SettingsTrack[];
  onClose: () => void;
  onSave: (config: Record<string, unknown>) => void;
}) {
  const definition = widgetDefinition(item.type);
  const [draft, setDraft] = useState<Record<string, unknown>>(item.config);
  const { toast } = useToast();
  const formId = useId();

  const set = (key: string, value: unknown) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const submit = () => {
    const parsed = definition.config.safeParse(draft);
    if (!parsed.success) {
      // The schema's messages are written for this dialog (see the registry);
      // anything without one gets a plain sentence, never a raw Zod string.
      const message = parsed.error.issues[0]?.message ?? "";
      toast(
        /^(Invalid|Too |Expected|Required)/.test(message) || message === ""
          ? "Those settings are not valid. Check each field and try again."
          : message,
      );
      return;
    }
    onSave(parsed.data as Record<string, unknown>);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      {/* Opened from a menu item that no longer exists, so Radix has nothing
          to return focus to; the shell places it on this widget's grip. */}
      <DialogContent onCloseAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{definition.name} settings</DialogTitle>
          <DialogDescription>
            Applies to this widget only. Saved when you save the layout.
          </DialogDescription>
        </DialogHeader>

        <form
          id={formId}
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          {definition.fields.map((field) => (
            <Field
              key={field.key}
              field={field}
              value={draft[field.key]}
              tracks={tracks}
              onChange={(value) => set(field.key, value)}
            />
          ))}
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  field,
  value,
  tracks,
  onChange,
}: {
  field: ConfigField;
  value: unknown;
  tracks: SettingsTrack[];
  onChange: (value: unknown) => void;
}) {
  const id = useId();

  if (field.kind === "select") {
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-sm font-medium">
          {field.label}
        </label>
        <select
          id={id}
          className={FIELD_CLASS}
          value={String(value)}
          onChange={(e) => {
            // Options carry their real type; a <select> only speaks strings.
            const match = field.options.find((o) => String(o.value) === e.target.value);
            if (match) onChange(match.value);
          }}
        >
          {field.options.map((option) => (
            <option key={String(option.value)} value={String(option.value)}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.kind === "track") {
    const selected = typeof value === "string" ? value : "";
    // A track that was deleted or archived since it was chosen: keep it
    // selectable as itself, so opening settings does not silently re-point
    // the widget at something else.
    const known = selected === "" || tracks.some((t) => t.id === selected);
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-sm font-medium">
          {field.label}
        </label>
        <select
          id={id}
          className={FIELD_CLASS}
          value={selected}
          onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
        >
          <option value="">{field.noneLabel}</option>
          {!known && <option value={selected}>(Track no longer available)</option>}
          {tracks.map((track) => (
            <option key={track.id} value={track.id}>
              {track.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.kind === "checks") {
    const chosen = Array.isArray(value) ? (value as string[]) : [];
    return (
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium">{field.label}</legend>
        {field.options.map((option) => {
          const checked = chosen.includes(option.value);
          return (
            <label key={option.value} className="flex min-h-9 items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--color-primary)]"
                checked={checked}
                // Kept in the options' own order, so the widget's buttons do
                // not reshuffle according to the order they were ticked in.
                onChange={() =>
                  onChange(
                    field.options
                      .map((o) => o.value)
                      .filter((v) => (v === option.value ? !checked : chosen.includes(v))),
                  )
                }
              />
              {option.label}
            </label>
          );
        })}
      </fieldset>
    );
  }

  return <GoalsField label={field.label} value={value} onChange={onChange} />;
}

/**
 * The goals list: a metric, a target and a window per row. Nothing here is a
 * counter — see `GOAL_METRICS` for why a goal is measured, not stored.
 */
function GoalsField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const goals = Array.isArray(value) ? (value as Goal[]) : [];
  const update = (index: number, patch: Partial<Goal>) =>
    onChange(goals.map((g, i) => (i === index ? { ...g, ...patch } : g)));

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-sm font-medium">{label}</legend>
      {goals.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No goals yet. Add one to start measuring against it.
        </p>
      )}
      {goals.map((goal, index) => (
        <div key={index} className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            aria-label={`Goal ${index + 1} target`}
            className={`${FIELD_CLASS} w-20 flex-none`}
            // An emptied field stays empty (and fails validation on Done)
            // rather than snapping to 0 — which made it impossible to clear
            // the box and type a new number without a stray leading zero.
            value={typeof goal.target === "number" && Number.isFinite(goal.target) ? goal.target : ""}
            onChange={(e) =>
              update(index, {
                target:
                  e.target.value.trim() === ""
                    ? (undefined as unknown as number)
                    : Math.round(Number(e.target.value)),
              })
            }
          />
          <select
            aria-label={`Goal ${index + 1} measure`}
            className={`${FIELD_CLASS} w-auto flex-1`}
            value={goal.metric}
            onChange={(e) => update(index, { metric: e.target.value as GoalMetric })}
          >
            {GOAL_METRICS.map((metric) => (
              <option key={metric} value={metric}>
                {GOAL_METRIC_LABELS[metric]}
              </option>
            ))}
          </select>
          <select
            aria-label={`Goal ${index + 1} period`}
            className={`${FIELD_CLASS} w-auto flex-none`}
            value={goal.period}
            onChange={(e) => update(index, { period: e.target.value as GoalPeriod })}
          >
            {GOAL_PERIODS.map((period) => (
              <option key={period} value={period}>
                {PERIOD_LABELS[period]}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 flex-none"
            aria-label={`Remove goal ${index + 1}`}
            onClick={() => onChange(goals.filter((_, i) => i !== index))}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      ))}
      {goals.length < MAX_GOALS && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() =>
            onChange([...goals, { metric: "sessions", target: 3, period: "week" }])
          }
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Add goal
        </Button>
      )}
    </fieldset>
  );
}
