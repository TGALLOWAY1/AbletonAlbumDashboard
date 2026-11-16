"use client";

import { Component, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { RotateCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * One widget's failure stays in that widget.
 *
 * Each widget reads its own data, so each can fail on its own — a timeout on
 * the sessions query should cost the heatmap, not the task list beside it,
 * and certainly not the page. Without this an error thrown while a widget
 * renders would climb to the route's `error.tsx` and replace the whole
 * dashboard. With it the card says it could not load and offers a retry,
 * and everything around it carries on.
 *
 * Retry re-requests the page's server data (`router.refresh()`) and remounts
 * the widget, so a transient failure clears without a full reload.
 */
class Boundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  // A refresh hands every widget a newly rendered node. If this one had
  // failed, that node is a fresh attempt, so show it — otherwise one "Try
  // again" would clear only the card it was pressed on while the others,
  // refreshed by the same request, stayed on their error message. If the new
  // node fails too it throws again and this flips straight back.
  componentDidUpdate(previous: { children: ReactNode }) {
    if (this.state.failed && previous.children !== this.props.children) {
      this.setState({ failed: false });
    }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function WidgetErrorBoundary({
  name,
  children,
}: {
  name: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);
  const [pending, startTransition] = useTransition();

  const retry = () =>
    startTransition(() => {
      router.refresh();
      setAttempt((n) => n + 1);
    });

  return (
    <Boundary
      key={attempt}
      fallback={
        <div
          role="alert"
          className="flex h-full min-h-28 flex-col items-center justify-center gap-2 p-4 text-center"
        >
          <TriangleAlert className="h-5 w-5 text-warning" aria-hidden />
          <p className="text-sm font-medium">{name} could not load</p>
          <p className="max-w-[30ch] text-xs text-muted-foreground">
            The rest of the dashboard is unaffected.
          </p>
          <Button size="sm" variant="outline" onClick={retry} disabled={pending}>
            <RotateCw className="h-3.5 w-3.5" aria-hidden />
            {pending ? "Retrying…" : "Try again"}
          </Button>
        </div>
      }
    >
      {children}
    </Boundary>
  );
}
