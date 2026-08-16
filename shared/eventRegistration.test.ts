import { describe, expect, it } from "vitest";
import { canCheckIn, resolveRegistrationStatus } from "./eventRegistration";

describe("活動 RSVP 容量規則", () => {
  it("未設定容量時一律可報名，設定容量後超額轉候補", () => {
    expect(resolveRegistrationStatus(null, 999)).toBe("registered");
    expect(resolveRegistrationStatus(3, 2)).toBe("registered");
    expect(resolveRegistrationStatus(3, 3)).toBe("waitlisted");
  });

  it("僅已報名狀態可以簽到", () => {
    expect(canCheckIn("registered")).toBe(true);
    expect(canCheckIn("waitlisted")).toBe(false);
    expect(canCheckIn("cancelled")).toBe(false);
  });
});
