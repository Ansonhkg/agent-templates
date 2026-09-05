import type { StepDefinition } from "../../chat-step/server/types";
import {
  initialVisual,
  canCompleteVisual,
  type VisualDraft,
} from "../visual/model";
import { visualTools, type ImageService } from "../visual/tools";
export function characterStep(
  images: ImageService,
  getContext?: StepDefinition<VisualDraft>["getContext"],
): StepDefinition<VisualDraft> {
  return {
    id: "character",
    getContext,
    initialResult: initialVisual,
    canComplete: canCompleteVisual,
    instructions: `Help the user create one character for their illustrations. Have a normal conversation: discuss personality, explain options, answer questions, and ask focused questions if needed. Keep replies short. A greeting is only a greeting. Use update_brief when they settle on or change a direction. Only use generate_character when they ask to generate or revise artwork, never merely for advice. Generate via the registered tool, not built-in image tools in this conversation. The tool's image worker does the drawing. Default to a simple full-body character alone on white; preserve identity during revisions. Describe results honestly. The right-hand panel already displays images, so do not emit Markdown image links or local paths. The user finishes this step with the completion button.`,
    tools: visualTools("character", images),
  };
}
