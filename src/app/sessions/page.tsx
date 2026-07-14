import { redirect } from "next/navigation";

// Session history now lives on /analytics under the "History" tab.
export default function SessionsPage() {
  redirect("/analytics");
}
