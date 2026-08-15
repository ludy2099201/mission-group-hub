import { describe, expect, it } from "vitest";
import { eventsByDayOfMonth } from "./calendar";

describe("活動月曆日期映射", () => {
  it("會把建立後儲存的活動記錄放入其開始日期的月份格", () => {
    const august = new Date(2026, 7, 1);
    const createdEvent = { id: 9, title: "新生小組歡迎會", startsAt: new Date(2026, 7, 23, 19, 0) };
    const result = eventsByDayOfMonth([createdEvent], august);
    expect(result.get(23)).toEqual([createdEvent]);
  });

  it("不會把其他月份的活動放入目前月曆", () => {
    const august = new Date(2026, 7, 1);
    const result = eventsByDayOfMonth([{ startsAt: new Date(2026, 8, 1) }], august);
    expect(result.size).toBe(0);
  });
});
