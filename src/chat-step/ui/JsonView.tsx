import { useState } from "react";
export function CodeBlock({ text, language = "text" }: { text: string; language?: string }) {
  const [status, setStatus] = useState("");
  let formatted = text.replace(/\n$/, "");
  if (language === "json") { try { formatted = JSON.stringify(JSON.parse(text), null, 2); } catch { /* Streaming JSON may be incomplete. */ } }
  return <div className="cs-code-block">
    <div className="cs-code-heading"><span>{language}</span><button type="button" aria-label={`Copy ${language}`} onClick={() => {
      void navigator.clipboard.writeText(formatted).then(() => setStatus("Copied"), () => setStatus("Copy failed. Select the text to copy."));
    }}>Copy</button></div>
    <pre tabIndex={0}><code>{formatted}</code></pre>
    {status && <span className="cs-copy-status" role="status">{status}</span>}
  </div>;
}
export function JsonView({ value }: { value: unknown }) {
  return <CodeBlock language="json" text={JSON.stringify(value, null, 2) ?? "null"} />;
}
