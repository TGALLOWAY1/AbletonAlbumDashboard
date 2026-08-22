import { redirect } from "next/navigation";
import { progressTabHref } from "@/lib/progress-tab";

// Session history now lives on the dashboard under Progress → History.
export default function SessionsPage() {
  redirect(progressTabHref("history"));
}
