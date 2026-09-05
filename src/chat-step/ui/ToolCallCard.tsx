import type { Activity } from "../types";
import { JsonView } from "./JsonView";
export function ToolCallCard({ activity }: { activity: Activity }) {
  const status = { running: "Working…", completed: "Done", cancelled: "Stopped", failed: "Could not finish" }[activity.status];
  const hasDetails = activity.input !== undefined || activity.output !== undefined || Boolean(activity.detail);
  const title = <><span aria-hidden="true">{activity.status === "completed" ? "✓" : activity.status === "running" ? "◌" : "−"}</span><span><strong>{activity.label}</strong><small role="status">{status}</small></span></>;
  if (!hasDetails) return <div className={`cs-tool-card cs-${activity.status}`}><div className="cs-tool-summary">{title}</div></div>;
  return <details className={`cs-tool-card cs-${activity.status}`}>
    <summary className="cs-tool-summary">{title}<span className="cs-tool-expand" aria-hidden="true">⌄</span></summary>
    <div className="cs-tool-details">
      {activity.detail && <p className={activity.status === "failed" ? "cs-error" : ""}>{activity.detail}</p>}
      {activity.input !== undefined && <section aria-label="Tool input"><h3>Input</h3><JsonView value={activity.input} /></section>}
      {activity.output !== undefined && <section aria-label="Tool output"><h3>Result</h3><JsonView value={activity.output} /></section>}
    </div>
  </details>;
}
