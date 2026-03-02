import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "@/types/chat";
import { formatTime } from "./utils";

interface ChatMessageProps {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-end">
        <span className="text-xs text-muted-foreground">
          {formatTime(message.timestamp)}
        </span>
      </div>
      <div
        className={cn(
          "max-w-xs rounded-lg px-3 py-2 text-sm",
          message.isFromCurrentUser
            ? "bg-primary text-primary-foreground ml-auto"
            : "bg-accent text-foreground"
        )}
      >
        {message.content}
      </div>
    </div>
  );
}
