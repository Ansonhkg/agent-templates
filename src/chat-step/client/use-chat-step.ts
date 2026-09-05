import { useEffect, useState } from "react";
import type { ChatTransport, Session } from "../types";
export function useChatStep<Result>(transport: ChatTransport<Result>) {
  const [session, setSession] = useState<Session<Result>>();
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    let current = true;
    setSession(undefined);
    setError("");
    const accept = (next: Session<Result>) => {
      if (current)
        setSession((previous) =>
          !previous || next.revision >= previous.revision ? next : previous,
        );
    };
    void transport
      .load()
      .then(accept)
      .catch((e) => current && setError(e.message));
    const unsubscribe = transport.subscribe(accept, setConnected);
    return () => {
      current = false;
      unsubscribe();
    };
  }, [transport]);
  async function perform<T>(action: () => Promise<T>) {
    setPending(true);
    setError("");
    try {
      return await action();
    } catch (error) {
      setError((error as Error).message);
      throw error;
    } finally {
      setPending(false);
    }
  }
  return {
    session,
    error: error || session?.error,
    connected,
    busy: pending || session?.status === "running",
    send: (text: string) => perform(() => transport.send(text)),
    cancel: () => perform(() => transport.cancel()),
    act: (name: string, args: unknown) =>
      perform(() => transport.act(name, args)),
    complete: () => perform(() => transport.complete()),
  };
}
