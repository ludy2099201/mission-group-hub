import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({ createAuditLog: vi.fn() }));
vi.mock("./db", () => ({ exportResources: ["missionaries", "supportCommitments", "prayers", "groups", "groupMembers", "attendance", "careLogs", "events", "announcements"], createAuditLog: dbMocks.createAuditLog }));
const { appRouter } = await import("./routers");

function adminContext(): TrpcContext { return { user: { id: 8, openId: "template-admin", name: "導入管理員", email: "template@example.com", loginMethod: "test", role: "Admin", isActive: true, deactivatedAt: null, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => undefined } as TrpcContext["res"] }; }

describe("governance.downloadImportTemplate", () => {
  it("由 Admin 下載只含欄位標頭的真實資料模板並留下稽核摘要", async () => {
    dbMocks.createAuditLog.mockResolvedValue(undefined);
    const result = await appRouter.createCaller(adminContext()).governance.downloadImportTemplate({ template: "pastoral_tasks" });
    expect(result.filename).toBe("牧養待辦_匯入模板.csv");
    expect(result.csv.trim().split("\n")).toHaveLength(1);
    expect(result.csv).toContain("assigned_to_email,due_at_iso,priority");
    expect(dbMocks.createAuditLog).toHaveBeenCalledWith({ actorUserId: 8, action: "data.template.download", entityType: "importTemplate", entityId: "pastoral_tasks", summary: "下載真實資料匯入模板：牧養待辦" });
  });
});
