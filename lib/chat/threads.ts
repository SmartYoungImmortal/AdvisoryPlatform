/**
 * The chat threads shown in the inbox. Until there is an API these ids are the
 * complete set, so they double as the `generateStaticParams` list that lets
 * `/chat/[id]` prerender instead of rendering on demand.
 */
export const chatThreadIds = [
  "sarah-jenskins",
  "christopher-nolan",
  "james-gunn",
] as const;
