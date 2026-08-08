import { z } from "zod";

import { Id, IsoDateTime } from "./common";

/**
 * Picks the glyph in `components/notifications/notification-center-screen.tsx`.
 * The backend sends the kind; the frontend owns the icon mapping, so adding a
 * lucide icon never requires a backend change.
 */
export const NotificationKind = z.enum([
  "message",
  "booking",
  "payment",
  "system",
]);

export const Notification = z.object({
  id: Id,
  kind: NotificationKind,
  title: z.string(),
  body: z.string(),
  createdAt: IsoDateTime,
  readAt: IsoDateTime.nullable(),
  /**
   * In-app path to open on tap, e.g. `/chat/sarah-jenskins`. Relative — never
   * an absolute URL, so it cannot be used to bounce a user off-site.
   */
  href: z.string().startsWith("/").nullable(),
});

export type NotificationKind = z.infer<typeof NotificationKind>;
export type Notification = z.infer<typeof Notification>;
