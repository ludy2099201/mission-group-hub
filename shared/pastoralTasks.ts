export type DueBucket = "overdue" | "today" | "upcoming" | "later" | "no_due";

export function classifyDueAt(dueAt: Date | null, now: Date): DueBucket {
  if (!dueAt) return "no_due";
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday); startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  const startOfUpcomingEnd = new Date(startOfToday); startOfUpcomingEnd.setDate(startOfUpcomingEnd.getDate() + 8);
  if (dueAt < startOfToday) return "overdue";
  if (dueAt < startOfTomorrow) return "today";
  if (dueAt < startOfUpcomingEnd) return "upcoming";
  return "later";
}

export type AbsenceRecord = { memberId: number; memberName: string; groupId: number; groupName: string; heldAt: Date };
export type AttendanceSuggestion = { memberId: number; groupId: number; title: string; detail: string; count: number };

export function buildAttendanceSuggestions(records: AbsenceRecord[]): AttendanceSuggestion[] {
  const grouped = new Map<number, AbsenceRecord[]>();
  records.forEach(record => grouped.set(record.memberId, [...(grouped.get(record.memberId) ?? []), record]));
  return Array.from(grouped.values()).filter(items => items.length >= 2).map(items => {
    const newest = [...items].sort((a, b) => b.heldAt.getTime() - a.heldAt.getTime())[0];
    return { memberId: newest.memberId, groupId: newest.groupId, title: `追蹤缺席：${newest.memberName}`, detail: `近 30 日於「${newest.groupName}」缺席 ${items.length} 次。`, count: items.length };
  }).sort((a, b) => b.count - a.count || a.title.localeCompare(b.title, "zh-Hant"));
}
