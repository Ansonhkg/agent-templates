import { z } from "zod";
import { StepError, defaultLimits, jsonPayload, type ExecutionLimits } from "./execution";
import type { Tool, ToolContext } from "./types";
export class ToolRegistry<Result> {
  private tools: Map<string, Tool<Result>>;
  constructor(tools: Tool<Result>[], private limits: ExecutionLimits = defaultLimits) {
    if (tools.length > limits.tools) throw new StepError("payload_limit", "Too many tools registered");
    if (tools.some(tool => !/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(tool.name))) throw new StepError("invalid_input", "Tool names must be 1–64 letters, digits, or underscores, starting with a letter");
    this.tools = new Map(tools.map((tool) => [tool.name, tool]));
    if (this.tools.size !== tools.length)
      throw new StepError("invalid_input", "Duplicate tool names");
    jsonPayload(this.definitions(), limits.manifestBytes, "Tool manifest");
  }
  definitions() {
    return [...this.tools.values()].map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: z.toJSONSchema(tool.schema) as Record<string, unknown>,
    }));
  }
  resolve(name: string, source: "model" | "ui") {
    const tool = this.tools.get(name);
    if (!tool || (source === "ui" && !tool.fromUI))
      throw new StepError("unavailable", "This action is not available here");
    return tool;
  }
  async execute(
    name: string,
    args: unknown,
    context: ToolContext<Result>,
    source: "model" | "ui",
  ) {
    context.signal.throwIfAborted();
    const tool = this.resolve(name, source);
    jsonPayload(args, this.limits.toolArgsBytes, "Tool arguments");
    const parsed = tool.schema.safeParse(args);
    if (!parsed.success) throw new StepError("invalid_input", "Tool arguments do not match the registered schema");
    const result = await tool.execute(parsed.data, context);
    context.signal.throwIfAborted();
    return JSON.parse(jsonPayload(result ?? null, this.limits.toolOutputBytes, "Tool output"));
  }
}
