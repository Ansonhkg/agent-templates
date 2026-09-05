import { useEffect, useState } from "react";
import { MockFlow, type FlowStep } from "./mock-flow";
const steps: FlowStep[] = [
  { label: "Not connected", description: "The app reads the connection status before offering sign-in." },
  { label: "Approve sign-in", description: "In a live app, Codex opens its sign-in flow. Here, approval is simulated." },
  { label: "Connected", description: "Account status is available. Your app can now make requests." },
  { label: "Send a request", description: "A small request is running. This example response is simulated." },
  { label: "Response received", description: "The request succeeded. This standalone connection can be used by any app." },
  { label: "Signed out", description: "Signing out clears the account state. You can start again." },
  { label: "Connection failed", description: "An alternate failure path: show an error and let the user reconnect.", branch: true, branchFrom: 1 },
];
export function MockConnection() {
  const [step, setStep] = useState(0);
  useEffect(() => { if (step !== 3) return; const timer = setTimeout(() => setStep(4), 1600); return () => clearTimeout(timer); }, [step]);
  const connected = step >= 2 && step <= 4;
  return <div className="mock-layout"><MockFlow steps={steps} step={step} go={setStep} />
    <section className="mock-surface"><h1>Sign in with Codex</h1><p>Connect an account, send a request, and sign out.</p>
      <div className="connection-demo-content"><h2>Your account</h2>
        <p role="status">{connected ? "Connected · Demo account" : step === 1 ? "Waiting for approval · Mock sign-in" : step === 6 ? "Connection unavailable" : step === 5 ? "Signed out" : "Not connected"}</p>
        {step === 1 ? <><p>No login page or credentials needed. Approve this mock sign-in to continue.</p><div className="mock-actions"><button onClick={() => setStep(2)}>Approve mock sign-in</button><button onClick={() => setStep(0)}>Cancel sign-in</button></div></> : connected ? <div className="mock-actions"><button onClick={() => setStep(1)}>Reconnect</button><button onClick={() => setStep(5)}>Sign out</button></div> : <button onClick={() => setStep(1)}>{step === 6 ? "Retry connection" : "Sign in with Codex →"}</button>}
        {step === 6 && <p role="alert">The simulated connection failed. Reconnect to try again.</p>}
        <h3>Try the connection</h3><p>Request: “Reply with a short greeting.”</p>
        <button disabled={!connected || step === 3} onClick={() => setStep(3)}>{step === 3 ? "Sending…" : "Test connection"}</button>
        <div className="connection-test-result" role="status">{step === 3 ? "Waiting for the mock response…" : step === 4 ? "Hello! Your connection is ready. (Mock response)" : ""}</div>
      </div>
    </section></div>;
}
