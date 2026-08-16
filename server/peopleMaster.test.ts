import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({ findPersonDuplicates: vi.fn(), createPerson: vi.fn(), createAuditLog: vi.fn() }));
vi.mock("./db", () => ({ exportResources: ["missionaries", "supportCommitments", "prayers", "groups", "groupMembers", "attendance", "careLogs", "events", "announcements"], ...dbMocks }));
const { appRouter } = await import("./routers");

function adminContext(): TrpcContext { return { user: { id: 21, openId: "people-admin", name: "資料管理員", email: "admin@example.com", loginMethod: "test", role: "Admin", isActive: true, deactivatedAt: null, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => undefined } as TrpcContext["res"] }; }

describe("中央人員主檔資料品質", () => {
  it("遇到疑似重複的人員時阻擋建立，直到 Admin 明確確認", async () => {
    dbMocks.findPersonDuplicates.mockResolvedValue([{ id: 4, fullName: "王小明" }]);
    const caller = appRouter.createCaller(adminContext());
    await expect(caller.people.create({ fullName: "王小明" })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(dbMocks.createPerson).not.toHaveBeenCalled();
  });

  it("在 Admin 明確允許後建立資料並寫入摘要稽核", async () => {
    dbMocks.findPersonDuplicates.mockResolvedValue([{ id: 4, fullName: "王小明" }]); dbMocks.createPerson.mockResolvedValue(87); dbMocks.createAuditLog.mockResolvedValue(undefined);
    const caller = appRouter.createCaller(adminContext());
    await caller.people.create({ fullName: "王小明", allowPossibleDuplicate: true, status: "active" });
    expect(dbMocks.createPerson).toHaveBeenCalledWith(expect.objectContaining({ fullName: "王小明", status: "active" }));
    expect(dbMocks.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "person.create", entityId: "87" }));
  });
});
