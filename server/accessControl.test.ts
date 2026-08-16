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

  it("拒絕 Member 存取牧養待辦與工作建議", async () => {
    const caller = appRouter.createCaller(createContext("Member"));
    await expect(caller.pastoral.tasks()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.pastoral.suggestions()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("拒絕非 Admin 讀取與建立中央人員主檔", async () => {
    const caller = appRouter.createCaller(createContext("Leader"));
    await expect(caller.people.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.people.create({ fullName: "測試會友" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("拒絕非 Admin 檢視或操作活動 RSVP 名單", async () => {
    const caller = appRouter.createCaller(createContext("Member"));
    await expect(caller.activities.registrations({ eventId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.activities.register({ eventId: 1, personId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
