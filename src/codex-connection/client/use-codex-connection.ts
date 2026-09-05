import { useEffect, useState } from "react";
import type { ConnectionState, ConnectionTransport } from "../types";
export function useCodexConnection(transport: ConnectionTransport) {
  const [state, setState] = useState<ConnectionState>({ connected: false, status: "connecting", imageGeneration: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let current = true;
    let receivedEvent = false;
    const accept = (next: ConnectionState) => { if (current) { setState(next); if (next.connected) setError(""); } };
    const off = transport.subscribe(next => { receivedEvent = true; accept(next); });
    void transport.read().then(next => { if (!receivedEvent) accept(next); }).catch(e => current && !receivedEvent && setError(e.message));
    return () => { current = false; off(); };
  }, [transport]);
  async function perform(action: () => Promise<ConnectionState>) {
    setBusy(true); setError("");
    try { setState(await action()); } catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  return { state, busy, error: error || state.error,
    login: (method: "browser" | "device") => perform(() => transport.login(method)),
    cancel: () => perform(() => transport.cancelLogin()),
    reconnect: () => perform(() => transport.reconnect()),
    logout: () => perform(() => transport.logout()),
  };
}
