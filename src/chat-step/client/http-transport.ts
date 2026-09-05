import type { ChatTransport, Session, SessionEvent } from "../types";
import { applySessionEvent } from "./session-events";
export function httpTransport<Result>(
  base: string,
  token: string,
): ChatTransport<Result> {
  async function request(path: string, body?: unknown) {
    const response = await fetch(
      base + path,
      body === undefined
        ? undefined
        : {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Chat-Step-Token": token,
            },
            body: JSON.stringify(body),
          },
    );
    const value = await response.json();
    if (!response.ok) throw new Error(value.error || "Request failed");
    return value;
  }
  return {
    load: () => request(""),
    subscribe(onSession, onConnection) {
      const events = new EventSource(base + "/events");
      let current: Session<Result> | undefined;
      let closed = false;
      let refreshing = false;
      let queued: SessionEvent<Result>[] = [];
      events.onopen = () => onConnection(true);
      events.onerror = () => onConnection(false);
      const accept = (event: SessionEvent<Result>) => {
        const next = applySessionEvent(current, event);
        if (next) { current = next; onSession(next); return; }
        queued.push(event);
        if (refreshing) return;
        refreshing = true;
        void request("").then(snapshot => {
          if (closed) return;
          current = applySessionEvent(current, { type: "snapshot", session: snapshot });
          const pending = queued; queued = [];
          for (const event of pending) current = applySessionEvent(current, event) || current;
          if (current) onSession(current);
        }).catch(() => onConnection(false)).finally(() => { refreshing = false; });
      };
      const receive = (event: Event) => { if (!closed) accept(JSON.parse((event as MessageEvent).data)); };
      events.addEventListener("snapshot", receive);
      events.addEventListener("text", receive);
      return () => { closed = true; events.close(); };
    },
    send: (text) => request("/messages", { text }),
    cancel: () => request("/cancel", {}),
    act: (name, args) => request("/actions", { name, args }),
    complete: () => request("/complete", {}),
  };
}
