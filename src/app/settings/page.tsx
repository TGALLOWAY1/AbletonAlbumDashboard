import { Settings as SettingsIcon } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Preferences for your dashboard and focus sessions.
        </p>
      </header>
      <ComingSoon
        icon={SettingsIcon}
        title="Preferences"
        description="Default focus duration, recommendation weights, and display preferences. (Single-user app, no auth.)"
      />
    </div>
  );
}
