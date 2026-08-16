import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({ getEventById: vi.fn(), getPersonById: vi.fn(), getEventRegistration: vi.fn(), countActiveEventRegistrations: vi.fn(), upsertEventRegistration: vi.fn(), checkInEventRegistration: vi.fn(), createAuditLog: vi.fn() }));
vi.mock("./db", () => ({ exportResources: ["missionaries", "supportCommitments", "prayers", "groups", "groupMembers", "attendance", "careLogs", "events", "announcements"], ...dbMocks }));
const { appRouter } = await import("./routers");

function adminContext(): TrpcContext { return { user: { id: 15, openId: "event-admin", name: "活動同工", email: "event@example.com", loginMethod: "test", role: "Admin", isActive: true, deactivatedAt: null, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => undefined } as TrpcContext["res"] }; }

describe("活動 RSVP 路由", () => {
  it("活動滿額時將新報名列為候補並留下稽核摘要", async () => {
    dbMocks.getEventById.mockResolvedValue({ id: 7, capacity: 2 }); dbMocks.getPersonById.mockResolvedValue({ id: 3, fullName: "林恩慈" }); dbMocks.getEventRegistration.mockResolvedValue(undefined); dbMocks.countActiveEventRegistrations.mockResolvedValue(2); dbMocks.upsertEventRegistration.mockResolvedValue(undefined); dbMocks.createAuditLog.mockResolvedValue(undefined);
    const result = await appRouter.createCaller(adminContext()).activities.register({ eventId: 7, personId: 3 });
    expect(result).toEqual({ status: "waitlisted", unchanged: false });
    expect(dbMocks.upsertEventRegistration).toHaveBeenCalledWith(7, 3, "waitlisted");
    expect(dbMocks.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "event.registration.create" }));
  });

  it("拒絕為候補或已取消人員簽到", async () => {
    dbMocks.getEventRegistration.mockResolvedValue({ status: "waitlisted" });
    await expect(appRouter.createCaller(adminContext()).activities.checkIn({ eventId: 7, personId: 3 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMocks.checkInEventRegistration).not.toHaveBeenCalled();
  });
});
