import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { common, createLowlight } from "lowlight";
import type { RootContent } from "hast";
const highlighter = createLowlight(common);
const aliases: Record<string, string> = { tsx: "typescript", jsx: "javascript", sh: "bash", shell: "bash", zsh: "bash" };
function tokens(nodes: RootContent[]): ReactNode {
  return nodes.map((node, index) => node.type === "text" ? node.value : node.type === "element"
    ? <span key={index} className={Array.isArray(node.properties.className) ? node.properties.className.join(" ") : undefined}>{tokens(node.children)}</span>
    : null);
}
export function CodeBlock({ text, language = "text" }: { text: string; language?: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const attempt = useRef(0);
  useEffect(() => {
    setStatus("idle");
    return () => { clearTimeout(timer.current); attempt.current++; };
  }, [text, language]);
  let formatted = text.replace(/\n$/, "");
  if (language === "json") { try { formatted = JSON.stringify(JSON.parse(text), null, 2); } catch { /* Streaming JSON may be incomplete. */ } }
  const highlighted = useMemo(() => {
    const grammar = aliases[language.toLowerCase()] || language.toLowerCase();
    // Keep unknown languages and large streamed payloads readable without expensive guessing.
    if (!highlighter.registered(grammar) || formatted.length > 50000) return formatted;
    try { return tokens(highlighter.highlight(grammar, formatted).children); } catch { return formatted; }
  }, [formatted, language]);
  async function copy() {
    const current = ++attempt.current;
    clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(formatted);
      if (current !== attempt.current) return;
      setStatus("copied");
      timer.current = setTimeout(() => setStatus("idle"), 2000);
    } catch { if (current === attempt.current) setStatus("error"); }
  }
  return <div className="cs-code-block">
    <div className="cs-code-heading"><span>{language}</span><div className="cs-copy-control">
      <span role="status" className="cs-copy-feedback">{status === "copied" ? "Copied" : status === "error" ? "Copy failed" : ""}</span>
      <button type="button" className="cs-copy-button" aria-label={`Copy ${language}`} title={status === "copied" ? "Copied" : status === "error" ? "Retry copy" : "Copy code"} data-state={status} onClick={() => void copy()}>
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {status === "copied" ? <path d="m5 12 4 4L19 6" /> : status === "error" ? <><path d="M12 5v9" /><path d="M12 19h.01" /></> : <><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>}
        </svg>
      </button>
    </div></div>
    <pre tabIndex={0} aria-label={`${language} code`}><code>{highlighted}</code></pre>
    {status === "error" && <span className="cs-copy-status">Select the text to copy, or try again.</span>}
  </div>;
}
export function JsonView({ value }: { value: unknown }) {
  return <CodeBlock language="json" text={JSON.stringify(value, null, 2) ?? "null"} />;
}
