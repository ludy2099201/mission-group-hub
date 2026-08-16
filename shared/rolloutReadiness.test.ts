import { describe, expect, it } from "vitest";
import { evaluateRolloutReadiness } from "./rolloutReadiness";

describe("上線前驗收準備狀態", () => {
  it("在資料不足時明確標示各項驗收尚不可執行", () => {
    expect(evaluateRolloutReadiness({ activeLeaders: 0, groups: 0, groupMembers: 0, meetings: 0, pendingCareLogs: 0, recentAbsences: 0, overdueTasks: 0, todayTasks: 0, upcomingTasks: 0 })).toEqual({ taskClassification: false, leaderScope: false, careSuggestions: false, absenceSuggestions: false });
  });

  it("在滿足真實資料條件時標示對應驗收可執行", () => {
    expect(evaluateRolloutReadiness({ activeLeaders: 1, groups: 1, groupMembers: 2, meetings: 1, pendingCareLogs: 1, recentAbsences: 1, overdueTasks: 1, todayTasks: 1, upcomingTasks: 1 })).toEqual({ taskClassification: true, leaderScope: true, careSuggestions: true, absenceSuggestions: true });
  });
});
