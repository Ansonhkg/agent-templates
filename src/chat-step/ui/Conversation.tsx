import { useEffect, useRef, type ReactNode } from "react";
import type { Activity, Message } from "../types";
import { MessageContent } from "./MessageContent";
import { ToolCallCard } from "./ToolCallCard";
export const ToolActivity = ToolCallCard;
export function Conversation({
  messages,
  busy,
  empty,
  renderActivity,
  renderMessage,
}: {
  messages: Message[];
  busy: boolean;
  empty: ReactNode;
  renderActivity?: (activity: Activity) => ReactNode;
  renderMessage?: (message: Message) => ReactNode;
}) {
  const scroll = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  useEffect(() => {
    if (follow.current && scroll.current)
      scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [messages, busy]);
  return (
    <div
      className="cs-conversation"
      ref={scroll}
      role="log"
      aria-label="Conversation"
      aria-live="polite"
      onScroll={() => {
        const el = scroll.current!;
        follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
      }}
    >
      {!messages.length && empty}
      {messages
        .filter((message) => message.activity || message.text.trim())
        .map((message) =>
          message.activity ? (
            <div key={message.id}>
              {renderActivity ? renderActivity(message.activity) : (
                <ToolActivity activity={message.activity} />
              )}
            </div>
          ) : (
            <div key={message.id} className={`cs-message cs-${message.role}`}>
              {renderMessage ? (
                renderMessage(message)
              ) : (
                <>
                  <span className="cs-author">
                    {message.role === "user" ? "You" : "Assistant"}
                  </span>
                  <MessageContent text={message.text} plain={message.role === "user"} />
                </>
              )}
            </div>
          ),
        )}
      {busy && (
        <p className="cs-working" role="status">
          Working on your request…
        </p>
      )}
    </div>
  );
}
