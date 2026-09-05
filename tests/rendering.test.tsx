import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { MessageContent } from "../src/chat-step/ui/MessageContent";
import { ToolCallCard } from "../src/chat-step/ui/ToolCallCard";
import { Conversation } from "../src/chat-step/ui/Conversation";
test("Markdown formats text, tables and code; plain user content remains literal", () => {
  const rendered = renderToStaticMarkup(<MessageContent text={'**Bold**\n\n- First\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n```json\n{"a":1}\n```'} />);
  assert.match(rendered, /<strong>Bold<\/strong>/); assert.match(rendered, /<li>First<\/li>/); assert.match(rendered, /<table>/);
  assert.match(rendered, /Copy json/); assert.match(rendered, /\n  &quot;a&quot;: 1/);
  assert.match(renderToStaticMarkup(<MessageContent plain text="**literal**" />), /\*\*literal\*\*/);
});
test("Markdown does not execute HTML, load remote images, or enable script links", () => {
  const rendered = renderToStaticMarkup(<MessageContent text={'<script>alert(1)</script>\n\n[bad](javascript:alert(1))\n\n![pixel](https://example.com/pixel.png)\n\n[good](https://example.com)'} />);
  assert.doesNotMatch(rendered, /<script|<img|href="javascript:/);
  assert.match(rendered, /rel="noopener noreferrer"/);
});
test("raw JSON is formatted, incomplete JSON stays readable, custom renderers may hide activity", () => {
  assert.match(renderToStaticMarkup(<MessageContent text={'{"language":"English"}'} />), /Copy json/);
  assert.match(renderToStaticMarkup(<MessageContent text={'{"language":'} />), /language/);
  const activity = { id: "a", name: "save", label: "Save", status: "completed" as const, input: { name: "Visible" }, output: { saved: true } };
  const rendered = renderToStaticMarkup(<ToolCallCard activity={activity} />);
  assert.match(rendered, /<details/); assert.match(rendered, /Tool input/); assert.match(rendered, /Tool output/);
  assert.doesNotMatch(renderToStaticMarkup(<Conversation busy={false} empty={null} messages={[{ id: "a", role: "assistant", text: "", activity }]} renderActivity={() => null} />), /Save/);
});
