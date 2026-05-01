import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

export function ComingSoon({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-start gap-3 p-8">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/12 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="max-w-prose text-sm text-muted-foreground">
          {description}
        </p>
        <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          Coming soon
        </span>
      </CardContent>
    </Card>
  );
}
