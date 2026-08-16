import { describe, expect, it } from "vitest";
import { buildGroupSecurityReview } from "./groupSecurityReview";

describe("保密小組風險盤點", () => {
  it("統計三種保密等級並辨識未指派的敏感小組", () => {
    const review = buildGroupSecurityReview([{ id: 1, name: "公開小組", status: "active", visibility: "public", leaderUserId: 2 }, { id: 2, name: "關懷小組", status: "active", visibility: "confidential", leaderUserId: null }]);
    expect(review.counts).toEqual({ public: 1, restricted: 0, confidential: 1 });
    expect(review.risks).toEqual(expect.arrayContaining([expect.objectContaining({ type: "public_review" }), expect.objectContaining({ type: "unassigned_sensitive", groupId: 2 })]));
  });
});
