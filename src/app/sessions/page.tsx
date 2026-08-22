import { redirect } from "next/navigation";

// Session history now lives on the dashboard under Progress → History.
export default function SessionsPage() {
  redirect("/#progress");
}
