import { WidgetBody, WidgetEmpty, WidgetHeader } from "@/components/dashboard/widget-parts";
import { WIDGETS, type WidgetProps } from "@/lib/dashboard/widgets";

// STUB — replaced by the real widget. Keep the export name and props.
export async function RecentSessionsWidget(_props: WidgetProps<"recent-sessions">) {
  return (
    <>
      <WidgetHeader title={WIDGETS["recent-sessions"].name} />
      <WidgetBody>
        <WidgetEmpty title="Not built yet" />
      </WidgetBody>
    </>
  );
}
