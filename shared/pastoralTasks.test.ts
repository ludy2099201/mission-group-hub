import { describe, expect, it } from "vitest";
import { buildAttendanceSuggestions, classifyDueAt } from "./pastoralTasks";

describe("牧養待辦到期分類", () => {
  const now = new Date("2026-08-16T10:00:00+08:00");
  it("會區分逾期、今日、近期與無到期日", () => {
    expect(classifyDueAt(new Date("2026-08-15T23:59:00+08:00"), now)).toBe("overdue");
    expect(classifyDueAt(new Date("2026-08-16T21:00:00+08:00"), now)).toBe("today");
    expect(classifyDueAt(new Date("2026-08-20T09:00:00+08:00"), now)).toBe("upcoming");
    expect(classifyDueAt(null, now)).toBe("no_due");
  });
});

describe("缺席待辦建議", () => {
  it("僅針對近期間重複缺席的成員產生合併建議", () => {
    const suggestions = buildAttendanceSuggestions([
      { memberId: 1, memberName: "王小明", groupId: 10, groupName: "恩典小組", heldAt: new Date("2026-08-10") },
      { memberId: 1, memberName: "王小明", groupId: 10, groupName: "恩典小組", heldAt: new Date("2026-08-03") },
      { memberId: 2, memberName: "李小華", groupId: 10, groupName: "恩典小組", heldAt: new Date("2026-08-10") },
    ]);
    expect(suggestions).toEqual([{ memberId: 1, groupId: 10, title: "追蹤缺席：王小明", detail: "近 30 日於「恩典小組」缺席 2 次。", count: 2 }]);
  });
});
