import type { ConnectionState, ConnectionTransport } from "../types";
export function codexHttpTransport(base: string, token: string): ConnectionTransport {
  async function request(path: string, post = false) {
    const response = await fetch(base + path, post ? { method: "POST", headers: { "X-Codex-Connection-Token": token } } : undefined);
    const value = await response.json();
    if (!response.ok) throw new Error(value.error || "Connection request failed");
    return value;
  }
  return {
    read: () => request(""), login: method => request(`/login/${method}`, true),
    cancelLogin: () => request("/login/cancel", true), logout: () => request("/logout", true), reconnect: () => request("/reconnect", true),
    subscribe(listener) {
      const events = new EventSource(base + "/events");
      let current: ConnectionState = { connected: false, status: "connecting", imageGeneration: false };
      events.addEventListener("connection", event => { current = JSON.parse((event as MessageEvent).data); listener(current); });
      // A restarted host starts with unknown account state. Its refresh publishes
      // a new SSE snapshot, including on automatic EventSource reconnect.
      events.onopen = () => { void request("").catch(() => {}); };
      events.onerror = () => listener({ ...current, connected: false, status: "error", error: "Connection to the local app was lost. Reconnecting…" });
      return () => events.close();
    },
  };
}
