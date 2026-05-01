import { getServerSupabase } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";

async function fetchStats() {
  const supabase = getServerSupabase();
  const [active, completed, totalTracks, sessions] = await Promise.all([
    supabase
      .from("tracks")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", OWNER_ID)
      .eq("status", "active"),
    supabase
      .from("tracks")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", OWNER_ID)
      .eq("status", "completed"),
    supabase
      .from("tracks")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", OWNER_ID),
    supabase
      .from("sessions")
      .select("duration_seconds, id, tracks!inner(owner_id)")
      .eq("tracks.owner_id", OWNER_ID),
  ]);

  const sessionRows = sessions.data ?? [];
  const totalSeconds = sessionRows.reduce(
    (acc, s) => acc + (s.duration_seconds ?? 0),
    0,
  );
  const total = totalTracks.count ?? 0;
  const completionRate = total === 0 ? 0 : (completed.count ?? 0) / total;

  return {
    activeCount: active.count ?? 0,
    completedCount: completed.count ?? 0,
    totalHours: totalSeconds / 3600,
    sessionCount: sessionRows.length,
    completionRate,
  };
}

export async function SidebarStats() {
  const s = await fetchStats();
  const rows: Array<[string, string]> = [
    ["Tracks in Progress", s.activeCount.toString()],
    ["Tracks Finished", s.completedCount.toString()],
    ["Total Hours", `${s.totalHours.toFixed(0)}h`],
    ["Focus Sessions", s.sessionCount.toString()],
  ];
  const completionPct = Math.round(s.completionRate * 100);

  return (
    <section>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Stats
      </div>
      <ul className="flex flex-col gap-1.5 text-sm">
        {rows.map(([label, value]) => (
          <li key={label} className="flex items-center justify-between">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium tabular-nums">{value}</span>
          </li>
        ))}
        <li className="mt-1">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Completion Rate</span>
            <span className="font-medium tabular-nums">{completionPct}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full bg-primary"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </li>
      </ul>
    </section>
  );
}
