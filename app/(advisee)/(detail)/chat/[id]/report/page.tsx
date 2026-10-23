import { ReportScreen } from "@/components/chat/report-screens";
import { chatThreadIds } from "@/lib/chat/threads";

export function generateStaticParams() {
  return chatThreadIds.map((id) => ({ id }));
}

export default async function ChatReportPage({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ReportScreen threadId={id} />;
}
