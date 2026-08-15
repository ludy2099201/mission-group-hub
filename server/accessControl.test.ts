import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(role: "Admin" | "Leader" | "Member"): TrpcContext {
  return {
    user: {
      id: 7,
      openId: `test-${role}`,
      name: "測試使用者",
      email: "test@example.com",
      loginMethod: "test",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("多角色存取限制", () => {
  it("拒絕 Member 建立宣教士檔案", async () => {
    const caller = appRouter.createCaller(createContext("Member"));
    await expect(caller.missionaries.create({
      name: "測試同工",
      ministryRegion: "測試地區",
      sendingOrganization: "測試機構",
      status: "active",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("拒絕 Leader 檢視支持者敏感資料與發布活動", async () => {
    const caller = appRouter.createCaller(createContext("Leader"));
    await expect(caller.missionaries.supporters()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.activities.createEvent({
      title: "測試活動",
      startsAt: Date.now() + 60_000,
      isPublished: true,
      groupIds: [],
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("拒絕非 Admin 管理使用者角色與建立小組", async () => {
    const caller = appRouter.createCaller(createContext("Leader"));
    await expect(caller.users.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.groups.create({ name: "測試小組", district: "測試牧區", status: "active" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
