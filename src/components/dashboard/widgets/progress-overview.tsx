import { WidgetBody, WidgetEmpty, WidgetHeader } from "@/components/dashboard/widget-parts";
import { WIDGETS, type WidgetProps } from "@/lib/dashboard/widgets";

// STUB — replaced by the real widget. Keep the export name and props.
export async function ProgressOverviewWidget(_props: WidgetProps<"progress-overview">) {
  return (
    <>
      <WidgetHeader title={WIDGETS["progress-overview"].name} />
      <WidgetBody>
        <WidgetEmpty title="Not built yet" />
      </WidgetBody>
    </>
  );
}
