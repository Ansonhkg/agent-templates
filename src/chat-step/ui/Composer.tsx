import { useState, type ReactNode } from "react";
export function Composer({
  busy,
  disabled,
  placeholder,
  send,
  cancel,
  accessory,
}: {
  busy: boolean;
  disabled?: boolean;
  placeholder: string;
  send(text: string): Promise<unknown>;
  cancel(): Promise<unknown>;
  accessory?: ReactNode;
}) {
  const [draft, setDraft] = useState("");
  async function submit() {
    if (busy || disabled || !draft.trim()) return;
    try {
      await send(draft.trim());
      setDraft("");
    } catch {
      /* Parent renders error; keep draft. */
    }
  }
  return (
    <form
      className="cs-composer"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <textarea
        aria-label="Message"
        dir="auto"
        value={draft}
        placeholder={placeholder}
        maxLength={12000}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            void submit();
          }
        }}
      />
      <div className="cs-composer-actions">
        <span>
          {accessory || "Enter to send · Shift + Enter for a new line"}
        </span>
        {busy ? (
          <button type="button" onClick={() => void cancel().catch(() => {})}>
            Stop
          </button>
        ) : (
          <button
            className="cs-send"
            aria-label="Send message"
            disabled={disabled || !draft.trim()}
          >
            ↑
          </button>
        )}
      </div>
    </form>
  );
}
