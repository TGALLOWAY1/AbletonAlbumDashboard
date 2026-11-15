import { WidgetBody, WidgetEmpty, WidgetHeader } from "@/components/dashboard/widget-parts";
import { WIDGETS, type WidgetProps } from "@/lib/dashboard/widgets";

// STUB — replaced by the real widget. Keep the export name and props.
export async function GoalsWidget(_props: WidgetProps<"goals">) {
  return (
    <>
      <WidgetHeader title={WIDGETS["goals"].name} />
      <WidgetBody>
        <WidgetEmpty title="Not built yet" />
      </WidgetBody>
    </>
  );
}
