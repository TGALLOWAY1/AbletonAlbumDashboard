import { getServerSupabase } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";

export type WeeklyDelta = {
  sessionCount: number;
  sessionSeconds: number;
  todosCompleted: number;
  bottlenecksResolved: number;
};

// What actually moved since `weekStartIso` (Monday). Powers the dashboard's
// "This week" stats so progress is framed as a weekly delta, not all-time
// vanity totals.
export async function getWeeklyDelta(weekStartIso: string): Promise<WeeklyDelta> {
  const supabase = getServerSupabase();

  const [sessions, todos, bottlenecks] = await Promise.all([
    // Sessions have no owner column (single-user V1) and may be track-less,
    // so they're not scoped through the tracks join like the other two.
    supabase
      .from("sessions")
      .select("duration_seconds, started_at, ended_at")
      .eq("status", "completed")
      .gte("started_at", weekStartIso),
    supabase
      .from("actions")
      .select("id, tracks!inner(owner_id)", { count: "exact", head: true })
      .eq("tracks.owner_id", OWNER_ID)
      .gte("completed_at", weekStartIso),
    supabase
      .from("bottlenecks")
      .select("id, tracks!inner(owner_id)", { count: "exact", head: true })
      .eq("tracks.owner_id", OWNER_ID)
      .gte("resolved_at", weekStartIso),
  ]);

  if (sessions.error) throw sessions.error;
  if (todos.error) throw todos.error;
  if (bottlenecks.error) throw bottlenecks.error;

  const sessionSeconds = (sessions.data ?? []).reduce((acc, s) => {
    if (s.duration_seconds != null) return acc + s.duration_seconds;
    if (s.started_at && s.ended_at) {
      const ms = new Date(s.ended_at).getTime() - new Date(s.started_at).getTime();
      return acc + Math.max(0, Math.round(ms / 1000));
    }
    return acc;
  }, 0);

  return {
    sessionCount: (sessions.data ?? []).length,
    sessionSeconds,
    todosCompleted: todos.count ?? 0,
    bottlenecksResolved: bottlenecks.count ?? 0,
  };
}
