import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(role: "Admin" | "Leader" | "Member", isActive = true): TrpcContext {
  return {
    user: {
      id: 42,
      openId: "governance-test-user",
      name: "治理測試使用者",
      email: "governance@example.com",
      loginMethod: "test",
      role,
      isActive,
      deactivatedAt: isActive ? null : new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("P0 帳號治理", () => {
  it("會在所有受保護程序之前阻擋停用帳號", async () => {
    const caller = appRouter.createCaller(createContext("Admin", false));
    await expect(caller.dashboard.overview()).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "此帳號已停用，請聯繫系統管理員。",
    });
  });

  it("拒絕非 Admin 查閱稽核紀錄", async () => {
    const caller = appRouter.createCaller(createContext("Leader"));
    await expect(caller.governance.auditLogs({ limit: 10 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("拒絕 Admin 停用自己的帳號", async () => {
    const caller = appRouter.createCaller(createContext("Admin"));
    await expect(caller.users.setStatus({ userId: 42, isActive: false })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "不可停用自己的帳號。",
    });
  });
});
