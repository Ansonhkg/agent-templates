import { useEffect, useMemo, useRef, useState } from "react";
import { VisualChatExample } from "./visual-chat-example";
import type { VisualDraft } from "../src/features/visual/model";
import type { Message, Session, ChatTransport } from "../src/chat-step/types";
import { MockFlow, type FlowStep } from "./mock-flow";
const steps: FlowStep[] = [
  { label: "Discuss an idea", description: "Ask questions before generating anything." },
  { label: "Stream a reply", description: "Assistant text arrives incrementally. Discussion alone does not generate an image." },
  { label: "Update the brief", description: "A tool call updates structured data. Expand the card to inspect its input and output." },
  { label: "Generate a result", description: "A generation tool runs after you request a preview. Stop cancels the operation." },
  { label: "Review the result", description: "A sample appears beside the conversation. You decide whether to refine it." },
  { label: "Refine and compare", description: "A second sample preserves the first. Select either version to compare." },
  { label: "Accept the result", description: "The selected result completes this step and can be passed to the next part of your app." },
  { label: "Generation failed", description: "On failure, keep the conversation and offer retry.", branch: true, branchFrom: 3 },
  { label: "Generation cancelled", description: "Stopping leaves the brief available so you can generate again.", branch: true, branchFrom: 3 },
];
function sampleUrl(kind: string, version: number) {
 const art = kind === "style"
  ? `<rect width="440" height="300" fill="${version === 1 ? '#f1e9dd' : '#e6ece8'}"/><circle cx="330" cy="65" r="27" fill="#c9aa87"/><path d="M0 240 120 65 275 275H0M155 275 315 125 440 270V300H155" fill="${version === 1 ? '#a6a995' : '#809e92'}"/>`
  : `<rect width="440" height="300" fill="#faf8f5"/><path d="M126 224Q114 190 155 124Q158 64 218 61Q279 64 282 129Q329 219 287 246Q193 280 126 224Z" fill="${version === 1 ? '#e9b5b7' : '#c4bddf'}" stroke="#34352f" stroke-width="4"/><circle cx="196" cy="132" r="5"/><circle cx="238" cy="132" r="5"/><path d="M197 156H238" stroke="#34352f" stroke-width="4"/>`;
 return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 300">${art}</svg>`)}`;
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
    ...(step >= 2 ? [{ id: "brief", role: "assistant" as const, text: "", activity: { id: "brief", name: "update_brief", label: "Update design brief", status: "completed" as const, input: { name: kind === "character" ? "Momo" : "Quiet landscape", purpose: kind }, output: { updated: true } } }] : []),
    ...(step >= 3 ? [{ id: "generate", role: "assistant" as const, text: "", activity: { id: "generate", name: `generate_${kind}`, label: `Generate ${kind}`, status: step === 3 ? "running" as const : step === 7 ? "failed" as const : step === 8 ? "cancelled" as const : "completed" as const, input: { brief: "Soft shapes and a quiet, curious personality" }, output: step >= 4 && step <= 6 ? { version } : undefined } }] : []),
    ...(step >= 5 && step <= 6 ? [{ id: "revision", role: "assistant" as const, text: "Here’s a second sample. Compare both versions, then choose the one you want to use." }] : []),
  ];
  async function send(text: string) { setQuestion(text); if (/generat|preview|draw/i.test(text)) go(3); else if (/brief/i.test(text)) go(2); else if (step >= 4 && step <= 6) go(5); else go(1); }
  const result: VisualDraft = {
    name: step >= 2 ? (kind === "character" ? "Momo" : "Quiet landscape") : "",
    brief: step >= 2 ? (kind === "character" ? "Soft shapes and a quiet, curious personality." : "Muted colors, generous white space, and soft pencil lines.") : "",
    versions: step >= 4 && step <= 6 ? Array.from({length:step >= 5 ? 2 : 1}, (_, i) => ({id:String(i+1), url:sampleUrl(kind,i+1), prompt:answer})) : [],
    selectedId: String(version),
  };
  const snapshot = useRef<Session<VisualDraft>>({id:kind,stepId:kind,messages:[],result,revision:0,status:"idle"});
  const listeners = useRef(new Set<(session: Session<VisualDraft>) => void>());
  const actions = useRef({send,cancel:async () => go(step === 3 ? 8 : 2)});
  actions.current = {send,cancel:async () => go(step === 3 ? 8 : 2)};
  const transport = useMemo<ChatTransport<VisualDraft>>(() => ({
    load: async () => snapshot.current,
    subscribe: (listener, connection) => { listeners.current.add(listener); connection(true); return () => { listeners.current.delete(listener); }; },
    send: text => actions.current.send(text),
    cancel: () => actions.current.cancel(),
    act: async (_name, args) => { setVersion(Number((args as {id:string}).id)); },
    complete: async () => snapshot.current,
  }), []);
  useEffect(() => {
    snapshot.current = {id:kind,stepId:kind,messages,result,revision:snapshot.current.revision+1,status:busy ? "running" : step === 7 ? "error" : step === 8 ? "cancelled" : "idle",error:step === 7 ? "Generation failed. Ask to generate again to retry." : undefined};
    listeners.current.forEach(listener => listener(snapshot.current));
  }, [step, stream, version, question, kind]);
  return <div className="mock-layout"><MockFlow steps={steps} step={step} go={go}/><div className="mock-chat-step">
    {step === 6 ? <section className="demo-finished"><h1>Your {kind} is ready.</h1><p>This example’s completion callback received the selected result. Your app can save it or advance its stepper here.</p><img src={sampleUrl(kind,version)} alt="Accepted result"/><button onClick={() => setStep(5)}>Keep refining</button></section> :
      <VisualChatExample kind={kind} transport={transport} onComplete={() => setStep(6)} />}
  </div></div>;
}
