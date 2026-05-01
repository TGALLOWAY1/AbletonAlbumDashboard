import { LayoutTemplate } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function TemplatesPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Templates</h1>
        <p className="mt-1 text-muted-foreground">
          Reusable production checklists and starting points.
        </p>
      </header>
      <ComingSoon
        icon={LayoutTemplate}
        title="Templates by genre"
        description="Save your typical track skeleton (stages, bottlenecks, default actions) per genre and apply it when you create a new track."
      />
    </div>
  );
}
