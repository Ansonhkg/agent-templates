import { useEffect, useState } from "react";
import { Conversation } from "../src/chat-step/ui/Conversation";
import { Composer } from "../src/chat-step/ui/Composer";
import type { Message } from "../src/chat-step/types";
import { MockFlow, type FlowStep } from "./mock-flow";
const steps: FlowStep[] = [
  { label: "Discuss an idea", description: "Ask questions before generating anything. This mock uses scripted replies." },
  { label: "Stream a reply", description: "Assistant text arrives incrementally. Discussion alone does not generate an image." },
  { label: "Update the brief", description: "A tool call updates structured data. Expand the card to inspect its input and output." },
  { label: "Generate a result", description: "A generation tool runs after you request a preview. Stop cancels this mock operation." },
  { label: "Review the result", description: "A sample appears beside the conversation. You decide whether to refine it." },
  { label: "Refine and compare", description: "A second sample preserves the first. Select either version to compare." },
  { label: "Accept the result", description: "The selected result completes this step and can be passed to the next part of your app." },
  { label: "Generation failed", description: "On failure, keep the conversation and offer retry.", branch: true, branchFrom: 3 },
  { label: "Generation cancelled", description: "Stopping leaves the brief available so you can generate again.", branch: true, branchFrom: 3 },
];
function Sample({ kind, version }: { kind: string; version: number }) {
  return <svg viewBox="0 0 440 300" role="img" aria-label={`Mock ${kind} sample, version ${version}`} className="mock-sample">
    <rect width="440" height="300" rx="18" fill={kind === "style" ? version === 1 ? "#f1e9dd" : "#e6ece8" : "#faf8f5"}/>
    {kind === "style" ? <><circle cx="330" cy="65" r="27" fill={version === 1 ? "#c9aa87" : "#a7bcad"}/><path d="M0 240 120 65 275 275H0M155 275 315 125 440 270V300H155" fill={version === 1 ? "#a6a995" : "#809e92"}/><path d="M0 285Q140 200 440 280" fill="none" stroke="#f9faf5" strokeWidth="12"/></> : <><path d="M126 224Q114 190 155 124Q158 64 218 61Q279 64 282 129Q329 219 287 246Q193 280 126 224Z" fill={version === 1 ? "#e9b5b7" : "#c4bddf"} stroke="#34352f" strokeWidth="4"/><circle cx="196" cy="132" r="5"/><circle cx="238" cy="132" r="5"/><path d="M197 156H238" stroke="#34352f" strokeWidth="4" strokeLinecap="round"/>{version === 2 && <path d="M267 195Q303 175 315 124M310 146L298 126M313 140L325 125" stroke="#34352f" strokeWidth="4" fill="none" strokeLinecap="round"/>}</>}
  </svg>;
}
export function MockChat({ kind }: { kind: "character" | "style" }) {
  const [step, setStep] = useState(0), [stream, setStream] = useState(0), [version, setVersion] = useState(1), [question, setQuestion] = useState("");
  const answer = kind === "character" ? "Try **quiet curiosity**: dot eyes, a straight mouth, and a soft pink silhouette. We can explore personality before drawing anything." : "Try **muted colors**, generous white space, and soft pencil lines. We can refine the direction before generating a sample.";
  useEffect(() => {
    setStream(0);
    if (step !== 1) return;
    const timer = setInterval(() => setStream(value => Math.min(value + 9, answer.length)), 40);
    return () => clearInterval(timer);
  }, [step, answer]);
  useEffect(() => { if (step !== 3) return; const timer = setTimeout(() => setStep(4), 2200); return () => clearTimeout(timer); }, [step]);
  function go(next: number) { setStep(next); setVersion(next >= 5 && next <= 6 ? 2 : 1); if (next === 0) setQuestion(""); }
  const busy = step === 3 || (step === 1 && stream < answer.length);
  const messages: Message[] = step === 0 ? [] : [
    { id: "question", role: "user", text: question || (kind === "character" ? "What personality would suit a little pink blob?" : "What would make this style feel calmer?") },
    { id: "answer", role: "assistant", text: step === 1 ? answer.slice(0, stream) : answer },
    ...(step >= 2 ? [{ id: "brief", role: "assistant" as const, text: "", activity: { id: "brief", name: "update_brief", label: "Update design brief", status: "completed" as const, input: { name: kind === "character" ? "Momo" : "Quiet landscape", purpose: kind }, output: { updated: true, mock: true } } }] : []),
    ...(step >= 3 ? [{ id: "generate", role: "assistant" as const, text: "", activity: { id: "generate", name: `generate_${kind}`, label: `Generate ${kind}`, status: step === 3 ? "running" as const : step === 7 ? "failed" as const : step === 8 ? "cancelled" as const : "completed" as const, input: { brief: "Demo design brief" }, output: step >= 4 && step <= 6 ? { version, mock: true } : undefined } }] : []),
    ...(step >= 5 && step <= 6 ? [{ id: "revision", role: "assistant" as const, text: "Here’s a second mock sample. Compare both versions, then choose the one you want to use." }] : []),
  ];
  async function send(text: string) { setQuestion(text); if (/generat|preview|draw/i.test(text)) go(3); else if (step >= 4 && step <= 6) go(5); else go(1); }
  return <div className="mock-layout"><MockFlow steps={steps} step={step} go={go}/><section className="cs-step mock-chat-step">
    <header className="cs-step-heading"><div><h1>Create your {kind}</h1><p>Discuss, generate, and refine in one place.</p></div></header>
    <div className="cs-workspace"><section className="cs-chat" aria-label="Chat"><h2>Work it out together</h2>
      <Conversation messages={messages} busy={busy} empty={<p>Start with an idea. Try a suggested action or type a message. Replies and artwork are scripted examples.</p>}/>
      <div className="mock-actions">
        {step === 0 && <button onClick={() => go(1)}>Discuss an idea</button>}
        {step === 1 && <button disabled={busy} onClick={() => go(2)}>Update the brief</button>}
        {(step === 2 || step === 7 || step === 8) && <button onClick={() => go(3)}>{step >= 7 ? "Retry generation" : "Generate a preview"}</button>}
        {step === 4 && <button onClick={() => go(5)}>Refine this result</button>}
      </div>
      <Composer busy={busy} placeholder="Ask a question or try a change…" send={send} cancel={async () => go(step === 3 ? 8 : 2)}/>
    </section><section className="cs-result" aria-label="Result"><h2>Your {kind === "character" ? "character" : "style sample"}</h2>
      <div className="cs-result-content">{step >= 4 && step <= 6 ? <><Sample kind={kind} version={version}/><p>Illustrative mock sample · Version {version}</p>{step >= 5 && <div className="mock-actions">{[1,2].map(v => <button key={v} aria-pressed={version === v} onClick={() => setVersion(v)}>Version {v}</button>)}</div>}</> : <div className="demo-welcome"><h3>{step === 3 ? "Generating mock sample…" : step === 7 ? "Generation failed" : step === 8 ? "Generation cancelled" : "Your creation appears here"}</h3><p>{step >= 7 ? "Your brief is kept. Retry whenever you’re ready." : "The result stays beside the conversation."}</p></div>}</div>
      <footer className="cs-result-footer">{step === 6 ? <p role="status">Version {version} accepted. This step is complete.</p> : <button className="cs-primary" disabled={step !== 4 && step !== 5} onClick={() => setStep(6)}>Use this {kind} →</button>}</footer>
    </section></div>
  </section></div>;
}
