import { redirect } from "next/navigation";
import { progressTabHref } from "@/lib/progress-tab";

// Session history lives on the analytics page, under its History tab.
export default function SessionsPage() {
  redirect(progressTabHref("history"));
}
