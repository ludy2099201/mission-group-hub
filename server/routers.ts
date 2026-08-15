import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { canLeadGroups, canManageChurch, canViewSensitiveGiving } from "./rolePolicy";
import { storagePut } from "./storage";

const idInput = z.object({ id: z.number().int().positive() });
const optionalText = z.string().trim().max(1000).nullable().optional();
const roleSchema = z.enum(["Admin", "Leader", "Member"]);

function requireAdmin(role: "Admin" | "Leader" | "Member") {
  if (!canManageChurch(role)) throw new TRPCError({ code: "FORBIDDEN", message: "此操作僅限 Admin 使用。" });
}

function requireGroupLeader(role: "Admin" | "Leader" | "Member") {
  if (!canLeadGroups(role)) throw new TRPCError({ code: "FORBIDDEN", message: "此操作僅限 Admin 或 Leader 使用。" });
}

async function requireOwnedGroup(user: { id: number; role: "Admin" | "Leader" | "Member" }, groupId: number) {
  requireGroupLeader(user.role);
  const group = await db.getGroupById(groupId);
  if (!group) throw new TRPCError({ code: "NOT_FOUND", message: "找不到指定小組。" });
  if (user.role === "Leader" && group.leaderUserId !== user.id) throw new TRPCError({ code: "FORBIDDEN", message: "您只能管理受指派的小組。" });
  return group;
}

const missionaryInput = z.object({
  name: z.string().trim().min(1).max(120),
  ministryRegion: z.string().trim().min(1).max(180),
  sendingOrganization: z.string().trim().min(1).max(180),
  contactEmail: z.string().trim().email().max(320).nullable().optional(),
  contactPhone: z.string().trim().max(64).nullable().optional(),
  photoUrl: z.string().trim().url().max(1024).nullable().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
});

const groupInput = z.object({
  name: z.string().trim().min(1).max(120),
  district: z.string().trim().min(1).max(120),
  leaderUserId: z.number().int().positive().nullable().optional(),
  description: optionalText,
  status: z.enum(["active", "inactive"]).default("active"),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  dashboard: router({
    overview: protectedProcedure.query(() => db.getDashboardData()),
  }),
  users: router({
    list: protectedProcedure.query(({ ctx }) => {
      requireAdmin(ctx.user.role);
      return db.listUsers();
    }),
    updateRole: protectedProcedure.input(z.object({ userId: z.number().int().positive(), role: roleSchema })).mutation(({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      if (input.userId === ctx.user.id && input.role !== "Admin") throw new TRPCError({ code: "BAD_REQUEST", message: "不可移除自己的 Admin 角色。" });
      return db.updateUserRole(input.userId, input.role);
    }),
  }),
  missionaries: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const rows = await db.listMissionaries();
      return ctx.user.role === "Member" ? rows.filter(row => row.status === "active") : rows;
    }),
    create: protectedProcedure.input(missionaryInput).mutation(({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      return db.createMissionary(input);
    }),
    update: protectedProcedure.input(idInput.merge(missionaryInput)).mutation(({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      const { id, ...data } = input;
      return db.updateMissionary(id, data);
    }),
    setStatus: protectedProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["active", "inactive"]) })).mutation(({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      return db.updateMissionary(input.id, { status: input.status });
    }),
    uploadPhoto: protectedProcedure.input(z.object({
      filename: z.string().trim().min(1).max(180),
      mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
      dataBase64: z.string().min(20).max(4_000_000),
    })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      const extension = input.mimeType === "image/png" ? "png" : input.mimeType === "image/webp" ? "webp" : "jpg";
      const safeStem = input.filename.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "missionary";
      const bytes = Buffer.from(input.dataBase64, "base64");
      if (bytes.length > 3_000_000) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "照片大小請控制在 3MB 以內。" });
      const stored = await storagePut(`missionaries/${ctx.user.id}/${safeStem}.${extension}`, bytes, input.mimeType);
      return { url: stored.url };
    }),
    supporters: protectedProcedure.query(({ ctx }) => {
      if (!canViewSensitiveGiving(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN", message: "支持者資料僅限 Admin 檢視。" });
      return db.listSupporters();
    }),
    createSupporter: protectedProcedure.input(z.object({ name: z.string().trim().min(1).max(120), email: z.string().email().nullable().optional(), phone: z.string().max(64).nullable().optional(), notes: optionalText })).mutation(({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      return db.createSupporter(input);
    }),
    commitments: protectedProcedure.input(idInput).query(({ ctx, input }) => {
      if (!canViewSensitiveGiving(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN", message: "支持資訊僅限 Admin 檢視。" });
      return db.listCommitmentsForMissionary(input.id);
    }),
    createCommitment: protectedProcedure.input(z.object({ missionaryId: z.number().int().positive(), supporterId: z.number().int().positive(), amount: z.number().positive(), currency: z.string().trim().min(1).max(8).default("TWD"), frequency: z.enum(["monthly", "quarterly", "yearly", "one_time"]), status: z.enum(["active", "paused", "ended"]).default("active") })).mutation(({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      return db.createCommitment({ ...input, amount: input.amount.toFixed(2), startedAt: new Date() });
    }),
    prayers: protectedProcedure.input(z.object({ missionaryId: z.number().int().positive().optional() })).query(async ({ ctx, input }) => {
      const rows = await db.listPrayerRequests(input.missionaryId);
      return ctx.user.role === "Member" ? rows.filter(row => !row.isArchived) : rows;
    }),
    createPrayer: protectedProcedure.input(z.object({ missionaryId: z.number().int().positive(), title: z.string().trim().min(1).max(180), content: z.string().trim().min(1).max(10000), status: z.enum(["praying", "answered"]).default("praying") })).mutation(({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      return db.createPrayerRequest({ ...input, isArchived: false, answeredAt: input.status === "answered" ? new Date() : null });
    }),
    updatePrayer: protectedProcedure.input(z.object({ id: z.number().int().positive(), title: z.string().trim().min(1).max(180), content: z.string().trim().min(1).max(10000), status: z.enum(["praying", "answered"]), isArchived: z.boolean() })).mutation(({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      const { id, status, isArchived, ...data } = input;
      return db.updatePrayerRequest(id, { ...data, status, isArchived, answeredAt: status === "answered" ? new Date() : null });
    }),
  }),
  groups: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      requireGroupLeader(ctx.user.role);
      const rows = await db.listGroups();
      return ctx.user.role === "Leader" ? rows.filter(row => row.leaderUserId === ctx.user.id) : rows;
    }),
    create: protectedProcedure.input(groupInput).mutation(({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      return db.createGroup(input);
    }),
    update: protectedProcedure.input(idInput.merge(groupInput)).mutation(async ({ ctx, input }) => {
      await requireOwnedGroup(ctx.user, input.id);
      if (ctx.user.role !== "Admin" && (input.leaderUserId !== undefined || input.status !== undefined)) throw new TRPCError({ code: "FORBIDDEN", message: "Leader 無法調整小組帶領人或狀態。" });
      const { id, ...data } = input;
      return db.updateGroup(id, data);
    }),
    members: protectedProcedure.input(z.object({ groupId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      await requireOwnedGroup(ctx.user, input.groupId);
      return db.listGroupMembers(input.groupId);
    }),
    addMember: protectedProcedure.input(z.object({ groupId: z.number().int().positive(), name: z.string().trim().min(1).max(120), email: z.string().email().nullable().optional(), phone: z.string().max(64).nullable().optional() })).mutation(async ({ ctx, input }) => {
      await requireOwnedGroup(ctx.user, input.groupId);
      return db.createGroupMember(input);
    }),
    meetings: protectedProcedure.input(z.object({ groupId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      await requireOwnedGroup(ctx.user, input.groupId);
      return db.listMeetings(input.groupId);
    }),
    attendanceSummary: protectedProcedure.input(z.object({ groupId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      await requireOwnedGroup(ctx.user, input.groupId);
      return db.getGroupAttendanceSummary(input.groupId);
    }),
    createMeeting: protectedProcedure.input(z.object({ groupId: z.number().int().positive(), title: z.string().trim().min(1).max(180), heldAt: z.number().int().positive(), notes: optionalText })).mutation(async ({ ctx, input }) => {
      await requireOwnedGroup(ctx.user, input.groupId);
      return db.createMeeting({ ...input, heldAt: new Date(input.heldAt) });
    }),
    attendance: protectedProcedure.input(z.object({ meetingId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const meeting = await db.getMeetingById(input.meetingId);
      if (!meeting) throw new TRPCError({ code: "NOT_FOUND", message: "找不到聚會記錄。" });
      await requireOwnedGroup(ctx.user, meeting.groupId);
      return db.listAttendance(input.meetingId);
    }),
    setAttendance: protectedProcedure.input(z.object({ meetingId: z.number().int().positive(), memberId: z.number().int().positive(), status: z.enum(["attended", "absent", "excused"]) })).mutation(async ({ ctx, input }) => {
      const meeting = await db.getMeetingById(input.meetingId);
      if (!meeting) throw new TRPCError({ code: "NOT_FOUND", message: "找不到聚會記錄。" });
      const member = await db.getGroupMemberById(input.memberId);
      if (!member || member.groupId !== meeting.groupId) throw new TRPCError({ code: "BAD_REQUEST", message: "成員不屬於此小組。" });
      await requireOwnedGroup(ctx.user, meeting.groupId);
      return db.upsertAttendance(input.meetingId, input.memberId, input.status);
    }),
    careLogs: protectedProcedure.input(z.object({ groupId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      await requireOwnedGroup(ctx.user, input.groupId);
      return db.listCareLogs(input.groupId);
    }),
    createCareLog: protectedProcedure.input(z.object({ groupMemberId: z.number().int().positive(), careDate: z.number().int().positive(), method: z.enum(["phone", "visit", "message", "meeting", "other"]), summary: z.string().trim().min(1).max(10000), followUpStatus: z.enum(["none", "pending", "completed"]) })).mutation(async ({ ctx, input }) => {
      const member = await db.getGroupMemberById(input.groupMemberId);
      if (!member) throw new TRPCError({ code: "NOT_FOUND", message: "找不到小組成員。" });
      await requireOwnedGroup(ctx.user, member.groupId);
      return db.createCareLog({ ...input, createdBy: ctx.user.id, careDate: new Date(input.careDate) });
    }),
  }),
  activities: router({
    events: protectedProcedure.query(({ ctx }) => db.listEvents(ctx.user.role === "Member")),
    createEvent: protectedProcedure.input(z.object({ title: z.string().trim().min(1).max(180), description: optionalText, location: z.string().trim().max(180).nullable().optional(), startsAt: z.number().int().positive(), endsAt: z.number().int().positive().nullable().optional(), isPublished: z.boolean().default(true), groupIds: z.array(z.number().int().positive()).default([]) })).mutation(({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      const { groupIds, startsAt, endsAt, ...data } = input;
      return db.createEvent({ ...data, startsAt: new Date(startsAt), endsAt: endsAt ? new Date(endsAt) : null, createdBy: ctx.user.id }, groupIds);
    }),
    announcements: protectedProcedure.query(({ ctx }) => db.listAnnouncements(ctx.user.role === "Member")),
    createAnnouncement: protectedProcedure.input(z.object({ title: z.string().trim().min(1).max(180), content: z.string().trim().min(1).max(10000), isPublished: z.boolean().default(true), groupIds: z.array(z.number().int().positive()).default([]) })).mutation(({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      const { groupIds, ...data } = input;
      return db.createAnnouncement({ ...data, createdBy: ctx.user.id, publishedAt: input.isPublished ? new Date() : null }, groupIds);
    }),
  }),
});

export type AppRouter = typeof appRouter;
