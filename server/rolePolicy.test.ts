import { describe, expect, it } from "vitest";
import { canAccessModule, canLeadGroups, canManageChurch, canViewSensitiveGiving } from "./rolePolicy";

describe("教會角色權限", () => {
  it("僅允許 Admin 管理全站與支持金額", () => {
    expect(canManageChurch("Admin")).toBe(true);
    expect(canManageChurch("Leader")).toBe(false);
    expect(canViewSensitiveGiving("Admin")).toBe(true);
    expect(canViewSensitiveGiving("Member")).toBe(false);
  });

  it("允許 Admin 與 Leader 管理小組，但 Member 不可", () => {
    expect(canLeadGroups("Admin")).toBe(true);
    expect(canLeadGroups("Leader")).toBe(true);
    expect(canLeadGroups("Member")).toBe(false);
  });

  it("明確套用宣教、小組、代禱、活動與權限模組的角色能力矩陣", () => {
    const expected = {
      Admin: { missionaries: true, supporters: true, prayers: true, groups: true, attendance: true, care: true, activities: true, announcements: true, permissions: true },
      Leader: { missionaries: true, supporters: false, prayers: true, groups: true, attendance: true, care: true, activities: true, announcements: true, permissions: false },
      Member: { missionaries: true, supporters: false, prayers: true, groups: false, attendance: false, care: false, activities: true, announcements: true, permissions: false },
    } as const;
    for (const [role, modules] of Object.entries(expected) as ["Admin" | "Leader" | "Member", Record<string, boolean>][]) {
      for (const [module, allowed] of Object.entries(modules)) {
        expect(canAccessModule(role, module as Parameters<typeof canAccessModule>[1])).toBe(allowed);
      }
    }
  });
});
