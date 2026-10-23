import { ChatThreadScreen } from "@/components/chat/chat-thread-screen";
import { chatThreadIds } from "@/lib/chat/threads";

export function generateStaticParams() {
  return chatThreadIds.map((id) => ({ id }));
}

export default async function ChatThreadMessageFailedPage({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ChatThreadScreen state="message-failed" threadId={id} />;
}
