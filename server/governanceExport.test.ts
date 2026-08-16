import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  getExportRows: vi.fn(),
  createAuditLog: vi.fn(),
}));

vi.mock("./db", () => ({
  exportResources: ["missionaries", "supportCommitments", "prayers", "groups", "groupMembers", "attendance", "careLogs", "events", "announcements"],
  getExportRows: dbMocks.getExportRows,
  createAuditLog: dbMocks.createAuditLog,
}));

const { appRouter } = await import("./routers");

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 5,
      openId: "export-admin",
      name: "匯出管理員",
      email: "export@example.com",
      loginMethod: "test",
      role: "Admin",
      isActive: true,
      deactivatedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("governance.exportCsv", () => {
  it("由 Admin 產生 UTF-8 CSV 並留下不含敏感內容的匯出稽核摘要", async () => {
    dbMocks.getExportRows.mockResolvedValue([{ name: "宣教同工", ministryRegion: "日本" }]);
    dbMocks.createAuditLog.mockResolvedValue(undefined);
    const caller = appRouter.createCaller(createAdminContext());

    const result = await caller.governance.exportCsv({ resource: "missionaries" });

    expect(result.filename).toMatch(/^mission-group-hub_missionaries_\d{4}-\d{2}-\d{2}\.csv$/);
    expect(result.rowCount).toBe(1);
    expect(result.csv).toContain("\uFEFFname,ministryRegion");
    expect(result.csv).toContain("宣教同工,日本");
    expect(dbMocks.createAuditLog).toHaveBeenCalledWith({
      actorUserId: 5,
      action: "data.export",
      entityType: "export",
      entityId: "missionaries",
      summary: "匯出 missionaries，共 1 筆",
    });
  });
});
