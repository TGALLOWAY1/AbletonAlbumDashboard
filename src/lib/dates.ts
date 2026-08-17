import { startOfWeek as dfStartOfWeek } from "date-fns";

// Monday-anchored week start. The dashboard's weekly stats run on this cadence.
export function startOfWeekMonday(d: Date): Date {
  return dfStartOfWeek(d, { weekStartsOn: 1 });
}
