import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { WorkFrame } from "@/components/work/work-frame";
import type { WorkTab } from "@/lib/work";

export { WORK_GUTTER } from "@/components/work/work-frame";

/**
 * One of the desk's six places (`WORK_TABS`) — today, the calendar, the
 * services, the hours, the requests, earnings — in the desk's frame
 * (`WorkFrame`): the menu at the left with this place marked, the place's
 * glyph and name as the page's title, and its action. The phone keeps the
 * advisor's tab bar with the desk selected.
 */
export function WorkHub({
  tab,
  action,
  children,
}: {
  readonly tab: WorkTab;
  /** The place's one action, at the right of the title (the services' "create"). */
  readonly action?: ReactNode;
  readonly children: ReactNode;
}) {
  const t = useTranslations("work");

  return (
    <WorkFrame action={action} place={tab} title={t(`tab.${tab}`)}>
      {children}
    </WorkFrame>
  );
}
