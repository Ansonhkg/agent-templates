import type { ResultViewProps } from "../../chat-step/ui/ChatStep";
import type { VisualDraft } from "./model";
import "./visual-result.css";
export function VisualResult({
  result,
  busy,
  act,
}: ResultViewProps<VisualDraft>) {
  const selected = result.versions.find((v) => v.id === result.selectedId);
  return (
    <div className="visual-result">
      <div className="visual-canvas">
        {selected ? (
          <img src={selected.url} alt={result.name || "Generated result"} />
        ) : (
          <div className="visual-empty">
            <span aria-hidden="true">✳</span>
            <h3>
              A little conversation.
              <br />
              Something that’s yours.
            </h3>
            <p>
              Discuss a direction on the left.
              <br />
              Ask to generate when you’re ready.
            </p>
          </div>
        )}
        {busy && (
          <span className="visual-progress">
            Working · Your current result stays here
          </span>
        )}
      </div>
      {result.versions.length > 0 && (
        <div className="visual-versions" aria-label="Versions">
          {result.versions.map((version, index) => (
            <button
              key={version.id}
              aria-pressed={version.id === result.selectedId}
              disabled={busy}
              aria-label={`Select version ${index + 1}`}
              onClick={() =>
                void act("select_version", { id: version.id }).catch(() => {})
              }
            >
              <img src={version.url} alt="" />
              <span>Version {index + 1}</span>
            </button>
          ))}
        </div>
      )}
      <div className="visual-brief">
        <h3>{result.name || "Your direction"}</h3>
        <p>
          {result.brief ||
            "The name and visual brief will develop as you work together."}
        </p>
      </div>
    </div>
  );
}
