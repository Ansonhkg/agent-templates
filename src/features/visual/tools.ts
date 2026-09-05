import { z } from "zod";
import type { Tool } from "../../chat-step/server/types";
import type { VisualDraft } from "./model";
// Supply your own image service; no Codex or HTTP imports in product actions.
export interface ImageService {
  generate(
    prompt: string,
    referenceId: string | undefined,
    signal: AbortSignal,
  ): Promise<{ id: string; url: string }>;
}
const briefSchema = z
  .object({
    name: z.string().min(1).max(80),
    brief: z.string().min(1).max(2500),
  })
  .strict();
const generateSchema = z
  .object({ prompt: z.string().min(1).max(4000) })
  .strict();
const selectSchema = z.object({ id: z.string().uuid() }).strict();
export function visualTools(
  kind: "character" | "style",
  images: ImageService,
): Tool<VisualDraft>[] {
  return [
    {
      name: "update_brief",
      label: "Update the brief",
      description:
        "Update the name and complete visual brief when the user specifies or changes a direction. This does NOT generate an image. Do not update when merely answering a question.",
      schema: briefSchema,
      display: {
        input: value => briefSchema.parse(value),
        output: value => z.object({ updated: z.boolean(), name: z.string(), brief: z.string() }).parse(value),
      },
      async execute(raw, context) {
        const args = briefSchema.parse(raw);
        await context.updateResult({ ...context.getResult(), ...args });
        return { updated: true, ...args };
      },
    },
    {
      name:
        kind === "character" ? "generate_character" : "generate_style_sample",
      label:
        kind === "character" ? "Draw a character" : "Generate a style sample",
      description: `Generate ONE real ${kind} image when the user asks to create, see, or revise it. Uses the selected result as reference for revisions. Costs inference/image generation. For discussions, questions or greetings, reply with text instead.`,
      schema: generateSchema,
      display: {
        input: value => generateSchema.parse(value),
        output: value => z.object({ generated: z.boolean(), version: z.number(), previewLocation: z.string() }).parse(value),
      },
      async execute(raw, context) {
        const { prompt } = generateSchema.parse(raw);
        const before = context.getResult();
        const generated = await images.generate(
          prompt,
          before.selectedId,
          context.signal,
        );
        context.signal.throwIfAborted();
        const current = context.getResult();
        await context.updateResult({
          ...current,
          versions: [...current.versions, { ...generated, prompt }],
          selectedId: generated.id,
        });
        return {
          generated: true,
          version: current.versions.length + 1,
          selectedId: generated.id,
          previewLocation: "Result panel on the right",
        };
      },
    },
    {
      name: "select_version",
      label: "Select a version",
      fromUI: true,
      description:
        "Select an existing generated version by its ID. Do not generate another image.",
      schema: selectSchema,
      display: { input: value => selectSchema.parse(value), output: value => z.object({ selectedId: z.string() }).parse(value) },
      async execute(raw, context) {
        const { id } = selectSchema.parse(raw);
        const result = context.getResult();
        if (!result.versions.some((version) => version.id === id))
          throw new Error("That version does not belong to this step");
        await context.updateResult({ ...result, selectedId: id });
        return { selectedId: id };
      },
    },
  ];
}
