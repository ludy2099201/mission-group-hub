import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  getGroupById: vi.fn(), getPastoralTaskById: vi.fn(), createPastoralTask: vi.fn(), updatePastoralTask: vi.fn(), createAuditLog: vi.fn(),
}));

vi.mock("./db", () => ({
  exportResources: ["missionaries", "supportCommitments", "prayers", "groups", "groupMembers", "attendance", "careLogs", "events", "announcements"],
  ...dbMocks,
}));

const { appRouter } = await import("./routers");

function leaderContext(): TrpcContext {
  return { user: { id: 8, openId: "leader-test", name: "測試小組長", email: "leader@example.com", loginMethod: "test", role: "Leader", isActive: true, deactivatedAt: null, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => undefined } as TrpcContext["res"] };
}

describe("牧養待辦 Leader 範圍", () => {
  it("拒絕 Leader 建立未連結受指派小組的關懷待辦", async () => {
    const caller = appRouter.createCaller(leaderContext());
    await expect(caller.pastoral.create({ type: "care_followup", title: "未指定小組的關懷" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("將 Leader 建立的小組待辦固定指派給自己，並寫入稽核紀錄", async () => {
    dbMocks.getGroupById.mockResolvedValue({ id: 3, leaderUserId: 8 });
    dbMocks.createPastoralTask.mockResolvedValue(91); dbMocks.createAuditLog.mockResolvedValue(undefined);
    const caller = appRouter.createCaller(leaderContext());
    await caller.pastoral.create({ type: "care_followup", title: "聯繫組員", groupId: 3, assignedToUserId: 99, priority: "high" });
    expect(dbMocks.createPastoralTask).toHaveBeenCalledWith(expect.objectContaining({ assignedToUserId: 8, groupId: 3, createdBy: 8, status: "open" }));
    expect(dbMocks.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "pastoralTask.create", entityId: "91" }));
  });

  it("允許 Leader 完成指派給自己的待辦，並留下狀態稽核", async () => {
    dbMocks.getPastoralTaskById.mockResolvedValue({ id: 44, assignedToUserId: 8, groupId: null });
    dbMocks.updatePastoralTask.mockResolvedValue(undefined); dbMocks.createAuditLog.mockResolvedValue(undefined);
    const caller = appRouter.createCaller(leaderContext());
    await caller.pastoral.setStatus({ id: 44, status: "completed" });
    expect(dbMocks.updatePastoralTask).toHaveBeenCalledWith(44, expect.objectContaining({ status: "completed", completedAt: expect.any(Date) }));
    expect(dbMocks.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "pastoralTask.completed", entityId: "44" }));
  });
});
