import type { Session, SessionEvent } from "../types";
// Undefined means a revision gap; request a fresh snapshot instead of guessing.
export function applySessionEvent<Result>(current: Session<Result> | undefined, event: SessionEvent<Result>): Session<Result> | undefined {
  if (event.type === "snapshot") return !current || event.session.revision >= current.revision ? event.session : current;
  if (!current) return undefined;
  if (event.revision <= current.revision) return current;
  if (event.revision !== current.revision + 1) return undefined;
  const messages = current.messages.map(message => ({ ...message }));
  let message = messages.find(message => message.id === event.id);
  if (!message) { message = { id: event.id, role: "assistant", text: "" }; messages.push(message); }
  message.text = event.mode === "append" ? message.text + event.text : event.text;
  return { ...current, messages, revision: event.revision };
}
