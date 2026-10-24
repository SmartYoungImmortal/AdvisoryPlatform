/**
 * The ids `/chat/[id]` (and its report and failed-message routes) prerender.
 *
 * `output: "export"` emits only what `generateStaticParams` names, and `next
 * dev` enforces the same list, so a room's uuid can never be a path segment:
 * it rides as `?id=` on `/chat/room` instead (`chatHref` in
 * `components/chat/chat-data.ts`), the way `?serviceId=` rides on a service
 * slug. The three names are the prototype threads that other screens still
 * link to; they open on the "not one of your conversations" notice.
 */
export const chatThreadIds = [
  "room",
  "sarah-jenskins",
  "christopher-nolan",
  "james-gunn",
] as const;
