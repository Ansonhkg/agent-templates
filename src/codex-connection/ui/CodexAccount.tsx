import { useEffect, useId, useRef, useState } from "react";
import type { ConnectionTransport } from "../types";
import { useCodexConnection } from "../client/use-codex-connection";
import "./codex-connection.css";
export function CodexAccount({ transport }: { transport: ConnectionTransport }) {
  const connection = useCodexConnection(transport);
  const { state, busy, error } = connection;
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => { if (open) dialog.current?.showModal(); else dialog.current?.close(); }, [open]);
  return <div className="cc-account">
    <button className="cc-trigger" onClick={() => setOpen(true)}>{state.connected ? "● Codex connected" : "Connect Codex"}</button>
    <dialog ref={dialog} aria-labelledby={titleId} className="cc-dialog" onCancel={() => { setOpen(false); setConfirm(false); }}>
      <header><h2 id={titleId}>Codex connection</h2><button aria-label="Close connection" onClick={() => { setOpen(false); setConfirm(false); }}>×</button></header>
      {error && <p className="cc-error" role="alert">{error}</p>}
      {confirm ? <><p>Sign out of this Codex account?</p><p>This changes the sign-in stored in this Codex home. Other apps using it may also be signed out.</p><div className="cc-actions"><button onClick={() => setConfirm(false)}>Keep signed in</button><button disabled={busy} onClick={() => void connection.logout().then(() => setConfirm(false))}>Confirm sign out</button></div></> :
        state.login ? <><p>Finish signing in through OpenAI, then return here. This window updates automatically.</p>{state.login.userCode && <p className="cc-code">{state.login.userCode}</p>}<a className="cc-primary" href={state.login.url} target="_blank" rel="noreferrer">Continue sign-in ↗</a><button disabled={busy} onClick={() => void connection.cancel()}>Cancel sign-in</button></> :
        state.connected ? <><p className="cc-identity">{state.email || "ChatGPT account"}</p><p>{state.plan || "Connected"} · {state.imageGeneration ? "Image generation available" : "Image capability unavailable"}</p><p>Your chats and tools can share this connection. Credentials stay with Codex.</p><div className="cc-actions"><button disabled={busy} onClick={() => void connection.reconnect()}>Reconnect</button><button disabled={busy} onClick={() => setConfirm(true)}>Sign out</button></div></> :
        <><p>Use your ChatGPT account to chat and run this step’s tools.</p><div className="cc-actions"><button className="cc-primary" disabled={busy} onClick={() => void connection.login("browser")}>Sign in with ChatGPT</button><button disabled={busy} onClick={() => void connection.login("device")}>Use device code</button><button disabled={busy} onClick={() => void connection.reconnect()}>Retry connection</button></div></>}
      {busy && <p role="status">Connecting…</p>}
    </dialog>
  </div>;
}
