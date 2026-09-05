import { isValidElement, type ReactNode } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock, JsonView } from "./JsonView";
export function MessageContent({ text, plain = false }: { text: string; plain?: boolean }) {
  if (plain) return <p dir="auto">{text}</p>;
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try { const value = JSON.parse(trimmed); if (value && typeof value === "object") return <JsonView value={value} />; } catch { /* Continue rendering incomplete streams as Markdown. */ }
  }
  return <div className="cs-markdown" dir="auto"><Markdown remarkPlugins={[remarkGfm]} skipHtml components={{
    a: ({ href, children }) => href ? <a href={href} target="_blank" rel="noopener noreferrer">{children}</a> : <span>{children}</span>,
    // Image assets belong in the host's result renderer; Markdown never loads remote pixels.
    img: ({ alt }) => <span>{alt ? `[Image: ${alt}]` : "[Image]"}</span>,
    table: ({ children }) => <div className="cs-table-scroll" tabIndex={0}><table>{children}</table></div>,
    pre: ({ children }) => {
      const code = isValidElement<{ className?: string; children?: ReactNode }>(children) ? children.props : undefined;
      return code && typeof code.children === "string"
        ? <CodeBlock text={code.children} language={code.className?.replace(/^language-/, "") || "text"} />
        : <pre>{children}</pre>;
    },
  }}>{text}</Markdown></div>;
}
