import { WidgetBody, WidgetEmpty, WidgetHeader } from "@/components/dashboard/widget-parts";
import { WIDGETS, type WidgetProps } from "@/lib/dashboard/widgets";

// STUB — replaced by the real widget. Keep the export name and props.
export async function WeeklyActivityWidget(_props: WidgetProps<"weekly-activity">) {
  return (
    <>
      <WidgetHeader title={WIDGETS["weekly-activity"].name} />
      <WidgetBody>
        <WidgetEmpty title="Not built yet" />
      </WidgetBody>
    </>
  );
}
