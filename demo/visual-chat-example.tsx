import { ChatStep } from "../src/chat-step/ui/ChatStep";
import { VisualResult } from "../src/features/visual/VisualResult";
import { canCompleteVisual, type VisualDraft } from "../src/features/visual/model";
import type { ChatTransport, Session } from "../src/chat-step/types";
export function VisualChatExample({ kind, transport, onComplete }: { kind: "character" | "style"; transport: ChatTransport<VisualDraft>; onComplete(session: Session<VisualDraft>): void }) {
  return (
              <ChatStep
                key={kind}
                transport={transport}
                title={`Create your ${kind}`}
                description={
                  kind === "character"
                    ? "Find the personality. Shape the details. Make it yours."
                    : "Explore a visual direction, then refine it on one sample."
                }
                resultTitle={
                  kind === "character" ? "Your character" : "Your style sample"
                }
                empty={
                  <div className="demo-welcome">
                    <span aria-hidden="true">◒</span>
                    <h3>
                      {kind === "character"
                        ? "Who are we bringing to life?"
                        : "What should it feel like?"}
                    </h3>
                    <p>
                      {kind === "character"
                        ? "Tell me a little about your character, or ask for ideas. We can discuss it before drawing anything."
                        : "Ask about different styles, or describe a look. When you ask for a sample, it will appear alongside our conversation."}
                    </p>
                    <p className="demo-hint">
                      Try:{" "}
                      {kind === "character"
                        ? "“What personality would suit a little pink blob?”"
                        : "“What would make this feel calmer?”"}
                    </p>
                  </div>
                }
                result={(props) => <VisualResult {...props} />}
                canComplete={canCompleteVisual}
                completeLabel={`Use this ${kind}`}
                onComplete={onComplete}
              />
  );
}
