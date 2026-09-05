export type VisualDraft = {
  name: string;
  brief: string;
  versions: { id: string; url: string; prompt: string }[];
  selectedId?: string;
};
export const initialVisual = (): VisualDraft => ({
  name: "",
  brief: "",
  versions: [],
});
export const canCompleteVisual = (result: VisualDraft) =>
  !!result.versions.find((v) => v.id === result.selectedId);
