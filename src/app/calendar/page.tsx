import { addDays, endOfMonth, startOfMonth } from "date-fns";
import { CalendarClient } from "@/components/calendar/calendar-client";
import { getSessionsInRange } from "@/lib/data/calendar-sessions";
import { getSessionTypes } from "@/lib/data/session-types";
import { getSessionTemplates } from "@/lib/data/session-templates";
import { getWeeklyReview } from "@/lib/data/weekly-reviews";
import { getAllTracks } from "@/lib/data/tracks";
import {
  isoDate,
  parseDayParam,
  parseWeekParam,
  startOfWeekMonday,
} from "@/lib/dates";
import { materializeRecurrencesForWeek } from "@/app/actions/session-recurrences";
import { isMobileUserAgent } from "@/lib/user-agent";

export const dynamic = "force-dynamic";

type View = "agenda" | "day" | "week" | "month";

function parseView(s: string | undefined, fallback: View): View {
  if (s === "agenda" || s === "day" || s === "week" || s === "month") return s;
  return fallback;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; d?: string }>;
}) {
  const params = await searchParams;
  const defaultView: View = (await isMobileUserAgent()) ? "agenda" : "week";
  const view = parseView(params.view, defaultView);

  const anchor =
    view === "week" ? parseWeekParam(params.d) : parseDayParam(params.d);

  let from: Date;
  let to: Date;
  if (view === "day") {
    from = new Date(anchor);
    from.setHours(0, 0, 0, 0);
    to = addDays(from, 1);
  } else if (view === "week") {
    from = startOfWeekMonday(anchor);
    to = addDays(from, 7);
  } else if (view === "agenda") {
    from = new Date(anchor);
    from.setHours(0, 0, 0, 0);
    to = addDays(from, 30);
  } else {
    const monthStart = startOfMonth(anchor);
    const monthEnd = endOfMonth(monthStart);
    from = startOfWeekMonday(monthStart);
    to = addDays(startOfWeekMonday(monthEnd), 7);
  }

  if (view === "week") {
    try {
      await materializeRecurrencesForWeek(isoDate(from));
    } catch {
      // non-fatal: continue rendering even if materialization hiccups
    }
  }

  const [sessions, sessionTypes, tracks, templates, weeklyReview] =
    await Promise.all([
      getSessionsInRange(from, to),
      getSessionTypes(),
      getAllTracks(),
      getSessionTemplates(),
      view === "week" ? getWeeklyReview(from) : Promise.resolve(null),
    ]);

  return (
    <CalendarClient
      initialView={view}
      anchorIso={anchor.toISOString()}
      sessions={sessions}
      sessionTypes={sessionTypes}
      tracks={tracks}
      templates={templates}
      weeklyReview={weeklyReview}
    />
  );
}
