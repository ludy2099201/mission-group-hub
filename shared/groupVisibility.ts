export type GroupVisibility = "public" | "restricted" | "confidential";

export function groupVisibilityMeta(visibility: GroupVisibility) {
  if (visibility === "public") return { label: "公開小組", description: "Member 僅可看基本資料", tone: "public" as const };
  if (visibility === "confidential") return { label: "保密小組", description: "僅 Admin 與帶領人", tone: "confidential" as const };
  return { label: "受限小組", description: "僅 Admin 與帶領人", tone: "restricted" as const };
}
