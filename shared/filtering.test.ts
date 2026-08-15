import { describe, expect, it } from "vitest";
import { filterActivities, filterGroups, filterMissionaries, filterPrayers } from "./filtering";

describe("管理頁篩選規則", () => {
  const missionaries = [
    { id: 1, name: "林恩惠", ministryRegion: "日本東京", sendingOrganization: "恩典差會", contactEmail: "lin@example.com", status: "active" as const },
    { id: 2, name: "王以諾", ministryRegion: "泰國清邁", sendingOrganization: "同行差會", contactEmail: null, status: "inactive" as const },
  ];

  it("可依名稱、服事地區與狀態篩選宣教士", () => {
    expect(filterMissionaries(missionaries, "東京", "active").map(item => item.id)).toEqual([1]);
    expect(filterMissionaries(missionaries, "", "inactive").map(item => item.id)).toEqual([2]);
    expect(filterMissionaries(missionaries, "不存在", "all")).toHaveLength(0);
  });

  it("將代禱中、已回應與已歸檔項目正確分流", () => {
    const prayers = [
      { id: 1, status: "praying" as const, isArchived: false },
      { id: 2, status: "answered" as const, isArchived: false },
      { id: 3, status: "answered" as const, isArchived: true },
    ];
    expect(filterPrayers(prayers, "current").map(item => item.id)).toEqual([1]);
    expect(filterPrayers(prayers, "answered").map(item => item.id)).toEqual([2]);
    expect(filterPrayers(prayers, "archived").map(item => item.id)).toEqual([3]);
  });

  it("可在小組與活動清單中以關鍵字定位資料", () => {
    expect(filterGroups([{ id: 1, name: "晨光小組", district: "信義牧區", leaderName: "陳牧師" }], "信義").map(item => item.id)).toEqual([1]);
    expect(filterActivities([{ id: 8, title: "親子講座", location: "恩典堂", description: null }], "恩典").map(item => item.id)).toEqual([8]);
  });
});
