import { describe, expect, it } from "vitest";
import { filterPastoralTasks, summarizeOpenPastoralTasks } from "./pastoralTaskView";

const now = new Date("2026-08-16T10:00:00+08:00");
const tasks = [
  { id: 1, status: "open" as const, dueAt: new Date("2026-08-15T20:00:00+08:00") },
  { id: 2, status: "open" as const, dueAt: new Date("2026-08-16T20:00:00+08:00") },
  { id: 3, status: "open" as const, dueAt: new Date("2026-08-19T20:00:00+08:00") },
  { id: 4, status: "completed" as const, dueAt: new Date("2026-08-12T20:00:00+08:00") },
  { id: 5, status: "dismissed" as const, dueAt: null },
];

describe("牧養工作中心非空待辦視圖", () => {
  it("統計時只納入進行中的逾期、今日與未來七日待辦", () => {
    expect(summarizeOpenPastoralTasks(tasks, now)).toEqual({ overdue: 1, today: 1, upcoming: 1 });
  });

  it("依進行中、已完成、已略過與全部正確篩選", () => {
    expect(filterPastoralTasks(tasks, "open").map(task => task.id)).toEqual([1, 2, 3]);
    expect(filterPastoralTasks(tasks, "completed").map(task => task.id)).toEqual([4]);
    expect(filterPastoralTasks(tasks, "dismissed").map(task => task.id)).toEqual([5]);
    expect(filterPastoralTasks(tasks, "all").map(task => task.id)).toEqual([1, 2, 3, 4, 5]);
  });
});
