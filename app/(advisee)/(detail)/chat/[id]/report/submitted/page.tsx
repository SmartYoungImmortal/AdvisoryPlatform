import { ReportSubmittedScreen } from "@/components/chat/report-screens";
import { chatThreadIds } from "@/lib/chat/threads";

export function generateStaticParams() {
  return chatThreadIds.map((id) => ({ id }));
}

export default async function ChatReportSubmittedPage({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ReportSubmittedScreen threadId={id} />;
}
