export type SecurityReviewGroup = { id: number; name: string; status: "active" | "inactive"; visibility: "public" | "restricted" | "confidential"; leaderUserId: number | null };

export function buildGroupSecurityReview(groups: SecurityReviewGroup[]) {
  const counts = { public: 0, restricted: 0, confidential: 0 };
  groups.forEach(group => { counts[group.visibility] += 1; });
  const risks = groups.flatMap(group => {
    const items: { groupId: number; groupName: string; type: "unassigned_sensitive" | "public_review" | "inactive_sensitive"; message: string }[] = [];
    if ((group.visibility === "restricted" || group.visibility === "confidential") && !group.leaderUserId) items.push({ groupId: group.id, groupName: group.name, type: "unassigned_sensitive", message: "受限／保密小組尚未指派帶領人。" });
    if (group.visibility === "public") items.push({ groupId: group.id, groupName: group.name, type: "public_review", message: "公開小組的名稱、牧區與說明可供 Member 瀏覽。" });
    if (group.status === "inactive" && group.visibility !== "public") items.push({ groupId: group.id, groupName: group.name, type: "inactive_sensitive", message: "已停用的受限／保密小組仍應由 Admin 決定保留或封存策略。" });
    return items;
  });
  return { counts, risks, total: groups.length };
}
