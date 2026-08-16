import { describe, expect, it, vi, beforeEach } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({ listPublicGroups: vi.fn(), getGroupById: vi.fn(), updateGroup: vi.fn(), createAuditLog: vi.fn() }));
vi.mock("./db", async importOriginal => ({ ...(await importOriginal<typeof import("./db")>()), ...dbMocks }));
import { appRouter } from "./routers";

function context(role: "Admin" | "Leader" | "Member", id = 7): TrpcContext {
  return { user: { id, openId: `${role}-${id}`, name: "測試使用者", email: "test@example.com", loginMethod: "test", role, isActive: true, deactivatedAt: null, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => undefined } as TrpcContext["res"] };
}

describe("保密小組存取控制", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("僅向 Member 回傳公開小組基本資料", async () => {
    const publicGroups = [{ id: 1, name: "公開小組", district: "恩典牧區", leaderUserId: 2, leaderName: "帶領人", description: "公開說明", status: "active", visibility: "public" as const, createdAt: new Date() }];
    dbMocks.listPublicGroups.mockResolvedValue(publicGroups);
    const result = await appRouter.createCaller(context("Member")).groups.list();
    expect(result).toEqual(publicGroups); expect(dbMocks.listPublicGroups).toHaveBeenCalledOnce();
  });

  it("拒絕 Member 讀取公開小組的名冊、出席與關懷細節", async () => {
    const caller = appRouter.createCaller(context("Member"));
    await expect(caller.groups.members({ groupId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.groups.careLogs({ groupId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("拒絕 Leader 變更小組保密等級", async () => {
    dbMocks.getGroupById.mockResolvedValue({ id: 1, leaderUserId: 7, visibility: "restricted" });
    await expect(appRouter.createCaller(context("Leader")).groups.update({ id: 1, name: "受限小組", district: "恩典牧區", visibility: "public" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("允許 Admin 設定保密等級並寫入稽核摘要", async () => {
    dbMocks.getGroupById.mockResolvedValue({ id: 1, leaderUserId: 7, visibility: "restricted" });
    await appRouter.createCaller(context("Admin")).groups.update({ id: 1, name: "關懷小組", district: "恩典牧區", visibility: "confidential" });
    expect(dbMocks.updateGroup).toHaveBeenCalledWith(1, expect.objectContaining({ visibility: "confidential" }));
    expect(dbMocks.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "group.update", entityId: "1" }));
  });
});
