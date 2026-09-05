import type { StepDefinition } from "../../chat-step/server/types";
import {
  initialVisual,
  canCompleteVisual,
  type VisualDraft,
} from "../visual/model";
import { visualTools, type ImageService } from "../visual/tools";
export function styleStep(images: ImageService, getContext?: StepDefinition<VisualDraft>["getContext"]): StepDefinition<VisualDraft> {
  return {
    id: "style",
    getContext,
    initialResult: initialVisual,
    canComplete: canCompleteVisual,
    instructions: `Help the user explore and refine one illustration style. Discuss options naturally; questions and greetings need only text. Keep replies short. Use update_brief when a visual direction is chosen or revised. Only call generate_style_sample when the user asks to see a sample or make a visual revision. Generate via that tool, not built-in image tools in this conversation. Keep the same scene across samples: a small deadpan pink blob uses an idea press to turn scattered notes into a paper crane, on white. Change the rendering style, not the composition. Preserve the selected image on revision. Results appear in the right panel; no Markdown images or file paths. The user chooses when to complete this step.`,
    tools: visualTools("style", images),
  };
}
