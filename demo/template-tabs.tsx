import type { ReactNode } from "react";
export function TemplateTabs({ base, source, sourcePanel, children }: {
  base: string; source: boolean; sourcePanel: ReactNode; children: ReactNode;
}) {
  function select(index: number) { location.hash = base + (index === 1 ? "/source" : ""); }
  return <div className="template-detail">
    <div className="template-toolbar">
      <a href="#templates">← Templates</a>
      <div role="tablist" aria-label="Template view" onKeyDown={event => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const index = event.key === "Home" ? 0 : event.key === "End" ? 1 : source ? 0 : 1;
        select(index);
        event.currentTarget.querySelectorAll<HTMLButtonElement>("[role=tab]")[index]?.focus();
      }}>
        <button id="demo-tab" role="tab" aria-selected={!source} aria-controls="demo-panel" tabIndex={source ? -1 : 0} onClick={() => select(0)}>Demo</button>
        <button id="source-tab" role="tab" aria-selected={source} aria-controls="source-panel" tabIndex={source ? 0 : -1} onClick={() => select(1)}>Source</button>
      </div>
    </div>
    <div className="template-panels">
      <div id="demo-panel" role="tabpanel" aria-labelledby="demo-tab" className="template-panel" hidden={source}>{children}</div>
      <div id="source-panel" role="tabpanel" aria-labelledby="source-tab" className="template-panel" hidden={!source}>{sourcePanel}</div>
    </div>
  </div>;
}
