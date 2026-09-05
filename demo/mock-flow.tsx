import { useEffect, useState } from "react";

export type FlowStep = { label: string; description: string; branch?: boolean; branchFrom?: number };
export function MockFlow({ steps, step, go }: { steps: FlowStep[]; step: number; go(step: number): void }) {
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const next = step + 1;
    if (next >= steps.length || steps[next].branch) { setPlaying(false); return; }
    const timer = setTimeout(() => go(next), 2200);
    return () => clearTimeout(timer);
  }, [playing, step, steps, go]);
  return <aside className="mock-flow" aria-label="Demo flow">
    <h2>See the full flow</h2>
    <p>Play the walkthrough or jump to a step. Try the controls alongside it.</p>
    <div className="mock-actions">
      <button onClick={() => { if (playing) setPlaying(false); else { go(0); setPlaying(true); } }}>{playing ? "Pause walkthrough" : "Play E2E"}</button>
      <button onClick={() => { setPlaying(false); go(0); }}>Reset demo</button>
    </div>
    <div className="mock-dag">
      <svg className="mock-edges" width="48" height={steps.length * 62} aria-hidden="true">
        {steps.map((item, index) => index === 0 ? null : <path key={item.label} d={item.branch ? `M10 ${(item.branchFrom ?? 1) * 62 + 31} V${index * 62 + 10} Q10 ${index * 62 + 31} 35 ${index * 62 + 31}` : `M10 ${(index - 1) * 62 + 31} V${index * 62 + 31}`} />)}
      </svg>
      {steps.map((item, index) => <button key={item.label} className={item.branch ? "mock-branch" : ""} aria-current={index === step ? "step" : undefined} onClick={() => { setPlaying(false); go(index); }}>
        <span className="mock-dot" aria-hidden="true">{index < step && !item.branch && !steps[step].branch ? "✓" : ""}</span>
        <span>{item.label}<small>{index === step ? "Current" : item.branch ? "Alternative path" : index < step && !steps[step].branch ? "Done" : "Explore"}</small></span>
      </button>)}
    </div>
    <p className="mock-explanation" role="status">{steps[step].description}</p>
  </aside>;
}
