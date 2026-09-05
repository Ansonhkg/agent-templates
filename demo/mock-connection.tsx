import { useEffect, useMemo, useState } from "react";
import { MockFlow, type FlowStep } from "./mock-flow";
import { ConnectionExampleView } from "./connection-example";
import { CodexAccount } from "../src/codex-connection/ui/CodexAccount";
import type { ConnectionState, ConnectionTransport } from "../src/codex-connection/types";
const steps: FlowStep[] = [
  { label: "Not connected", description: "The app reads the connection status before offering sign-in." },
  { label: "Approve sign-in", description: "Codex opens its sign-in flow. The account updates after approval." },
  { label: "Connected", description: "Account status is available. Your app can now make requests." },
  { label: "Send a request", description: "A small request is running. The response appears when it completes." },
  { label: "Response received", description: "The request succeeded. This standalone connection can be used by any app." },
  { label: "Signed out", description: "Signing out clears the account state. You can start again." },
  { label: "Connection failed", description: "An alternate failure path: show an error and let the user reconnect.", branch: true, branchFrom: 1 },
];
export function MockConnection() {
  const [step, setStep] = useState(0);
  const [userCode, setUserCode] = useState<string>();
  useEffect(() => { if (step !== 3) return; const timer = setTimeout(() => setStep(4), 1600); return () => clearTimeout(timer); }, [step]);
  const connected = step >= 2 && step <= 4;
  const state: ConnectionState = {
    connected, status: connected ? "connected" : step === 6 ? "error" : "signed-out", imageGeneration: connected,
    ...(connected ? { plan: "Plus" } : {}),
    ...(step === 1 ? { login: { id: "example-login", url: "#connection", userCode } } : {}),
    ...(step === 6 ? { error: "Connection failed. Reconnect to try again." } : {}),
  };
  const transport = useMemo<ConnectionTransport>(() => ({
    read: async () => state,
    subscribe: () => () => {},
    login: async (method) => { setUserCode(method === "device" ? "ABCD-EFGH" : undefined); setStep(1); return { ...state, login: { id: "example-login", url: "#connection" } }; },
    cancelLogin: async () => { setStep(0); return { connected:false, status:"signed-out", imageGeneration:false }; },
    reconnect: async () => { setStep(1); return state; },
    logout: async () => { setStep(5); return { connected:false, status:"signed-out", imageGeneration:false }; },
  }), [step, userCode]);
  return <div className="mock-layout"><MockFlow steps={steps} step={step} go={setStep} />
    <ConnectionExampleView state={state} error={state.error}
      account={<CodexAccount key={step} transport={transport} defaultOpen={step === 1} onContinueSignIn={() => setStep(2)} />}
      testing={step === 3} reply={step === 4 ? "Hello! Your connection is ready." : ""}
      onTest={() => setStep(3)} onCancelTest={() => setStep(2)} />
  </div>;
}
