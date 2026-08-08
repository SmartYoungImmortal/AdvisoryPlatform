import { ChatThreadScreen } from "@/components/chat/chat-thread-screen";
import { chatThreadIds } from "@/lib/chat/threads";

export function generateStaticParams() {
  return chatThreadIds.map((id) => ({ id }));
}

export default function ChatThreadMessageFailedPage() {
  return <ChatThreadScreen state="message-failed" />;
}
