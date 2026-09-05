import type { ReactNode } from "react";
import type { Activity, ChatTransport, Message, Session } from "../types";
import { useChatStep } from "../client/use-chat-step";
import { Composer } from "./Composer";
import { Conversation } from "./Conversation";
export type ResultViewProps<Result> = {
  result: Result;
  busy: boolean;
  act(name: string, args: unknown): Promise<unknown>;
};
export function ChatStep<Result>({
  transport,
  title,
  description,
  resultTitle,
  placeholder = "Ask a question or describe a change…",
  empty,
  header,
  result,
  canComplete,
  completeLabel = "Use this result",
  onComplete,
  renderActivity,
  renderMessage,
  composerAccessory,
}: {
  transport: ChatTransport<Result>;
  title: string;
  description: string;
  resultTitle: string;
  placeholder?: string;
  empty?: ReactNode;
  header?: ReactNode;
  composerAccessory?: ReactNode;
  result(props: ResultViewProps<Result>): ReactNode;
  canComplete(result: Result): boolean;
  completeLabel?: string;
  onComplete(session: Session<Result>): void;
  renderActivity?: (activity: Activity) => ReactNode;
  renderMessage?: (message: Message) => ReactNode;
}) {
  const chat = useChatStep(transport);
  return (
    <section className="cs-step">
      {header}
      <header className="cs-step-heading">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <span className="cs-connection">
          {chat.connected ? "● Connected" : "Reconnecting…"}
        </span>
      </header>
      <div className="cs-workspace">
        <section className="cs-chat" aria-label="Chat">
          <h2>Work it out together</h2>
          <Conversation
            messages={chat.session?.messages || []}
            busy={chat.busy}
            empty={empty}
            renderActivity={renderActivity}
            renderMessage={renderMessage}
          />
          {chat.error && (
            <div className="cs-error" role="alert">
              {chat.error}
            </div>
          )}
          <Composer
            busy={chat.busy}
            disabled={!chat.session || !chat.connected}
            placeholder={placeholder}
            send={chat.send}
            cancel={chat.cancel}
            accessory={composerAccessory}
          />
        </section>
        <section className="cs-result" aria-label="Result">
          <h2>{resultTitle}</h2>
          <div className="cs-result-content">
            {chat.session &&
              result({
                result: chat.session.result,
                busy: chat.busy,
                act: chat.act,
              })}
          </div>
          <footer className="cs-result-footer">
            <span>You choose when this step is done.</span>
            <button
              className="cs-primary"
              disabled={
                chat.busy || !chat.session || !canComplete(chat.session.result)
              }
              onClick={() =>
                void chat
                  .complete()
                  .then(onComplete)
                  .catch(() => {})
              }
            >
              {completeLabel} <span aria-hidden="true">→</span>
            </button>
          </footer>
        </section>
      </div>
    </section>
  );
}
