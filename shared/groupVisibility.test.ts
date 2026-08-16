import { describe, expect, it } from "vitest";
import { groupVisibilityMeta } from "./groupVisibility";

describe("小組保密等級顯示", () => {
  it("為三種可見性提供明確的標籤與存取說明", () => {
    expect(groupVisibilityMeta("public")).toMatchObject({ label: "公開小組", tone: "public" });
    expect(groupVisibilityMeta("restricted")).toMatchObject({ label: "受限小組", tone: "restricted" });
    expect(groupVisibilityMeta("confidential")).toMatchObject({ label: "保密小組", tone: "confidential" });
  });
});
