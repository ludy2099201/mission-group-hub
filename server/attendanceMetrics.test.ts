import { describe, expect, it } from "vitest";
import { calculateAttendanceSummary } from "./attendanceMetrics";

describe("小組出席率統計", () => {
  it("僅將出席狀態納入出席人數，並以所有點名紀錄作為分母", () => {
    expect(calculateAttendanceSummary(["attended", "attended", "absent", "excused"])).toEqual({
      totalRecords: 4,
      attendedCount: 2,
      rate: 50,
    });
  });

  it("在尚無點名資料時回傳 0%，避免除以零", () => {
    expect(calculateAttendanceSummary([])).toEqual({ totalRecords: 0, attendedCount: 0, rate: 0 });
  });
});
