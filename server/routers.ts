import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { canLeadGroups, canManageChurch, canViewSensitiveGiving } from "./rolePolicy";
import { storagePut } from "./storage";
import { rowsToCsv } from "../shared/csv";
import { getImportTemplate, importTemplateKeys } from "../shared/importTemplates";
import { buildAttendanceSuggestions } from "../shared/pastoralTasks";
import { canCheckIn, resolveRegistrationStatus } from "../shared/eventRegistration";

const idInput = z.object({ id: z.number().int().positive() });
const optionalText = z.string().trim().max(1000).nullable().optional();
const roleSchema = z.enum(["Admin", "Leader", "Member"]);

function requireAdmin(role: "Admin" | "Leader" | "Member") {
  if (!canManageChurch(role)) throw new TRPCError({ code: "FORBIDDEN", message: "此操作僅限 Admin 使用。" });
}

async function writeAudit(userId: number, action: string, entityType: string, entityId: string | number | null, summary: string) {
  await db.createAuditLog({ actorUserId: userId, action, entityType, entityId: entityId === null ? null : String(entityId), summary });
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

async function requirePastoralTaskAccess(user: { id: number; role: "Admin" | "Leader" | "Member" }, taskId: number) {
  requireGroupLeader(user.role);
  const task = await db.getPastoralTaskById(taskId);
  if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "找不到指定待辦。" });
  if (user.role === "Leader" && task.assignedToUserId !== user.id) {
    if (!task.groupId) throw new TRPCError({ code: "FORBIDDEN", message: "您只能處理指派給自己的待辦。" });
    await requireOwnedGroup(user, task.groupId);
  }
  return task;
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
    updateRole: protectedProcedure.input(z.object({ userId: z.number().int().positive(), role: roleSchema })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      if (input.userId === ctx.user.id && input.role !== "Admin") throw new TRPCError({ code: "BAD_REQUEST", message: "不可移除自己的 Admin 角色。" });
      const target = await db.getUserById(input.userId);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "找不到指定使用者。" });
      if (target.role === "Admin" && target.isActive && input.role !== "Admin" && await db.countActiveAdmins() <= 1) throw new TRPCError({ code: "BAD_REQUEST", message: "系統至少需要保留一位啟用中的 Admin。" });
      await db.updateUserRole(input.userId, input.role);
      await writeAudit(ctx.user.id, "user.role.update", "user", input.userId, `角色調整為 ${input.role}`);
    }),
    setStatus: protectedProcedure.input(z.object({ userId: z.number().int().positive(), isActive: z.boolean() })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      if (input.userId === ctx.user.id && !input.isActive) throw new TRPCError({ code: "BAD_REQUEST", message: "不可停用自己的帳號。" });
      const target = await db.getUserById(input.userId);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "找不到指定使用者。" });
      if (target.role === "Admin" && target.isActive && !input.isActive && await db.countActiveAdmins() <= 1) throw new TRPCError({ code: "BAD_REQUEST", message: "系統至少需要保留一位啟用中的 Admin。" });
      await db.updateUserStatus(input.userId, input.isActive);
      await writeAudit(ctx.user.id, input.isActive ? "user.activate" : "user.deactivate", "user", input.userId, input.isActive ? "帳號已啟用" : "帳號已停用");
    }),
  }),
  governance: router({
    auditLogs: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(200).default(50) })).query(({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      return db.listAuditLogs(input.limit);
    }),
    exportCsv: protectedProcedure.input(z.object({ resource: z.enum(db.exportResources) })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      const rows = await db.getExportRows(input.resource);
      const csv = rowsToCsv(rows);
      await writeAudit(ctx.user.id, "data.export", "export", input.resource, `匯出 ${input.resource}，共 ${rows.length} 筆`);
      return { filename: `mission-group-hub_${input.resource}_${new Date().toISOString().slice(0, 10)}.csv`, csv, rowCount: rows.length };
    }),
    downloadImportTemplate: protectedProcedure.input(z.object({ template: z.enum(importTemplateKeys) })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role); const template = getImportTemplate(input.template);
      await writeAudit(ctx.user.id, "data.template.download", "importTemplate", input.template, `下載真實資料匯入模板：${template.label}`);
      return template;
    }),
  }),
  missionaries: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const rows = await db.listMissionaries();
      return ctx.user.role === "Member" ? rows.filter(row => row.status === "active") : rows;
    }),
    create: protectedProcedure.input(missionaryInput).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      const id = await db.createMissionary(input);
      await writeAudit(ctx.user.id, "missionary.create", "missionary", id, `建立宣教士檔案：${input.name}`);
      return id;
    }),
    update: protectedProcedure.input(idInput.merge(missionaryInput)).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      const { id, ...data } = input;
      await db.updateMissionary(id, data);
      await writeAudit(ctx.user.id, "missionary.update", "missionary", id, `更新宣教士檔案：${data.name}`);
    }),
    setStatus: protectedProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["active", "inactive"]) })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      await db.updateMissionary(input.id, { status: input.status });
      await writeAudit(ctx.user.id, "missionary.status.update", "missionary", input.id, `宣教士狀態調整為 ${input.status}`);
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
    createSupporter: protectedProcedure.input(z.object({ name: z.string().trim().min(1).max(120), email: z.string().email().nullable().optional(), phone: z.string().max(64).nullable().optional(), notes: optionalText })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      const id = await db.createSupporter(input);
      await writeAudit(ctx.user.id, "supporter.create", "supporter", id, `建立支持者資料：${input.name}`);
      return id;
    }),
    commitments: protectedProcedure.input(idInput).query(({ ctx, input }) => {
      if (!canViewSensitiveGiving(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN", message: "支持資訊僅限 Admin 檢視。" });
      return db.listCommitmentsForMissionary(input.id);
    }),
    createCommitment: protectedProcedure.input(z.object({ missionaryId: z.number().int().positive(), supporterId: z.number().int().positive(), amount: z.number().positive(), currency: z.string().trim().min(1).max(8).default("TWD"), frequency: z.enum(["monthly", "quarterly", "yearly", "one_time"]), status: z.enum(["active", "paused", "ended"]).default("active") })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      const id = await db.createCommitment({ ...input, amount: input.amount.toFixed(2), startedAt: new Date() });
      await writeAudit(ctx.user.id, "support.commitment.create", "supportCommitment", id, `建立支持承諾：宣教士 #${input.missionaryId}`);
      return id;
    }),
    prayers: protectedProcedure.input(z.object({ missionaryId: z.number().int().positive().optional() })).query(async ({ ctx, input }) => {
      const rows = await db.listPrayerRequests(input.missionaryId);
      return ctx.user.role === "Member" ? rows.filter(row => !row.isArchived) : rows;
    }),
    createPrayer: protectedProcedure.input(z.object({ missionaryId: z.number().int().positive(), title: z.string().trim().min(1).max(180), content: z.string().trim().min(1).max(10000), status: z.enum(["praying", "answered"]).default("praying") })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      const id = await db.createPrayerRequest({ ...input, isArchived: false, answeredAt: input.status === "answered" ? new Date() : null });
      await writeAudit(ctx.user.id, "prayer.create", "prayer", id, `建立代禱事項：${input.title}`);
      return id;
    }),
    updatePrayer: protectedProcedure.input(z.object({ id: z.number().int().positive(), title: z.string().trim().min(1).max(180), content: z.string().trim().min(1).max(10000), status: z.enum(["praying", "answered"]), isArchived: z.boolean() })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      const { id, status, isArchived, ...data } = input;
      await db.updatePrayerRequest(id, { ...data, status, isArchived, answeredAt: status === "answered" ? new Date() : null });
      await writeAudit(ctx.user.id, "prayer.update", "prayer", id, `更新代禱事項：${data.title}`);
    }),
  }),
  groups: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      requireGroupLeader(ctx.user.role);
      const rows = await db.listGroups();
      return ctx.user.role === "Leader" ? rows.filter(row => row.leaderUserId === ctx.user.id) : rows;
    }),
    create: protectedProcedure.input(groupInput).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      const id = await db.createGroup(input);
      await writeAudit(ctx.user.id, "group.create", "group", id, `建立小組：${input.name}`);
      return id;
    }),
    update: protectedProcedure.input(idInput.merge(groupInput)).mutation(async ({ ctx, input }) => {
      await requireOwnedGroup(ctx.user, input.id);
      if (ctx.user.role !== "Admin" && (input.leaderUserId !== undefined || input.status !== undefined)) throw new TRPCError({ code: "FORBIDDEN", message: "Leader 無法調整小組帶領人或狀態。" });
      const { id, ...data } = input;
      await db.updateGroup(id, data);
      await writeAudit(ctx.user.id, "group.update", "group", id, `更新小組：${data.name}`);
    }),
    members: protectedProcedure.input(z.object({ groupId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      await requireOwnedGroup(ctx.user, input.groupId);
      return db.listGroupMembers(input.groupId);
    }),
    addMember: protectedProcedure.input(z.object({ groupId: z.number().int().positive(), name: z.string().trim().min(1).max(120), email: z.string().email().nullable().optional(), phone: z.string().max(64).nullable().optional() })).mutation(async ({ ctx, input }) => {
      await requireOwnedGroup(ctx.user, input.groupId);
      const id = await db.createGroupMember(input);
      await writeAudit(ctx.user.id, "group.member.create", "groupMember", id, `新增小組成員：${input.name}`);
      return id;
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
      const id = await db.createMeeting({ ...input, heldAt: new Date(input.heldAt) });
      await writeAudit(ctx.user.id, "group.meeting.create", "meeting", id, `建立聚會：${input.title}`);
      return id;
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
      await db.upsertAttendance(input.meetingId, input.memberId, input.status);
      await writeAudit(ctx.user.id, "group.attendance.update", "meeting", input.meetingId, `更新成員 #${input.memberId} 出席狀態為 ${input.status}`);
    }),
    careLogs: protectedProcedure.input(z.object({ groupId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      await requireOwnedGroup(ctx.user, input.groupId);
      return db.listCareLogs(input.groupId);
    }),
    createCareLog: protectedProcedure.input(z.object({ groupMemberId: z.number().int().positive(), careDate: z.number().int().positive(), method: z.enum(["phone", "visit", "message", "meeting", "other"]), summary: z.string().trim().min(1).max(10000), followUpStatus: z.enum(["none", "pending", "completed"]) })).mutation(async ({ ctx, input }) => {
      const member = await db.getGroupMemberById(input.groupMemberId);
      if (!member) throw new TRPCError({ code: "NOT_FOUND", message: "找不到小組成員。" });
      await requireOwnedGroup(ctx.user, member.groupId);
      const id = await db.createCareLog({ ...input, createdBy: ctx.user.id, careDate: new Date(input.careDate) });
      await writeAudit(ctx.user.id, "careLog.create", "careLog", id, `新增關懷紀錄：成員 #${input.groupMemberId}`);
      return id;
    }),
  }),
  pastoral: router({
    assignees: protectedProcedure.query(async ({ ctx }) => {
      requireGroupLeader(ctx.user.role);
      return ctx.user.role === "Admin" ? db.listActiveUsers() : [{ id: ctx.user.id, name: ctx.user.name, email: ctx.user.email, role: ctx.user.role }];
    }),
    groups: protectedProcedure.query(async ({ ctx }) => {
      requireGroupLeader(ctx.user.role);
      const rows = await db.listGroups();
      return ctx.user.role === "Admin" ? rows.filter(group => group.status === "active") : rows.filter(group => group.status === "active" && group.leaderUserId === ctx.user.id);
    }),
    tasks: protectedProcedure.query(({ ctx }) => {
      requireGroupLeader(ctx.user.role);
      return db.listPastoralTasks(ctx.user);
    }),
    suggestions: protectedProcedure.query(async ({ ctx }) => {
      requireGroupLeader(ctx.user.role);
      const leaderId = ctx.user.role === "Leader" ? ctx.user.id : undefined;
      const [care, absences, prayers] = await Promise.all([
        db.listCareFollowupSuggestions(leaderId),
        db.listRecentAbsenceRecords(leaderId),
        ctx.user.role === "Admin" ? db.listPrayerFollowupSuggestions() : Promise.resolve([]),
      ]);
      return {
        care: care.map(item => ({ type: "care_followup" as const, title: `關懷跟進：${item.memberName}`, detail: `關懷紀錄待跟進：${item.groupName}`, groupId: item.groupId, groupMemberId: item.memberId, careLogId: item.id })),
        attendance: buildAttendanceSuggestions(absences).map(item => ({ type: "attendance_followup" as const, ...item })),
        prayers: prayers.map(item => ({ type: "prayer_followup" as const, title: `代禱跟進：${item.title}`, detail: `宣教士：${item.missionaryName}`, missionaryId: item.missionaryId, prayerRequestId: item.id })),
      };
    }),
    create: protectedProcedure.input(z.object({
      type: z.enum(["care_followup", "prayer_followup", "attendance_followup", "general"]),
      title: z.string().trim().min(1).max(180), detail: optionalText, assignedToUserId: z.number().int().positive().optional(),
      dueAt: z.number().int().positive().nullable().optional(), priority: z.enum(["low", "normal", "high"]).default("normal"),
      groupId: z.number().int().positive().nullable().optional(), groupMemberId: z.number().int().positive().nullable().optional(),
      missionaryId: z.number().int().positive().nullable().optional(), prayerRequestId: z.number().int().positive().nullable().optional(),
    })).mutation(async ({ ctx, input }) => {
      requireGroupLeader(ctx.user.role);
      const assignedToUserId = ctx.user.role === "Leader" ? ctx.user.id : (input.assignedToUserId ?? ctx.user.id);
      if (ctx.user.role === "Leader" && input.groupId) await requireOwnedGroup(ctx.user, input.groupId);
      if (ctx.user.role === "Leader" && !input.groupId && input.type !== "prayer_followup") throw new TRPCError({ code: "BAD_REQUEST", message: "Leader 建立的小組待辦需指定受指派小組。" });
      const { dueAt, ...data } = input;
      const id = await db.createPastoralTask({ ...data, assignedToUserId, dueAt: dueAt ? new Date(dueAt) : null, createdBy: ctx.user.id, status: "open", completedAt: null });
      await writeAudit(ctx.user.id, "pastoralTask.create", "pastoralTask", id, `建立牧養待辦：${input.title}`);
      return id;
    }),
    update: protectedProcedure.input(z.object({
      id: z.number().int().positive(), title: z.string().trim().min(1).max(180).optional(), detail: optionalText,
      dueAt: z.number().int().positive().nullable().optional(), priority: z.enum(["low", "normal", "high"]).optional(),
      assignedToUserId: z.number().int().positive().optional(), groupId: z.number().int().positive().nullable().optional(),
    })).mutation(async ({ ctx, input }) => {
      const task = await requirePastoralTaskAccess(ctx.user, input.id);
      if (ctx.user.role === "Leader" && input.assignedToUserId && input.assignedToUserId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Leader 無法轉派待辦。" });
      if (ctx.user.role === "Leader" && input.groupId) await requireOwnedGroup(ctx.user, input.groupId);
      const { id, dueAt, ...data } = input;
      await db.updatePastoralTask(id, { ...data, dueAt: dueAt === undefined ? undefined : dueAt === null ? null : new Date(dueAt) });
      await writeAudit(ctx.user.id, "pastoralTask.update", "pastoralTask", task.id, "更新牧養待辦摘要或到期日");
    }),
    setStatus: protectedProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["open", "completed", "dismissed"]) })).mutation(async ({ ctx, input }) => {
      const task = await requirePastoralTaskAccess(ctx.user, input.id);
      await db.updatePastoralTask(task.id, { status: input.status, completedAt: input.status === "completed" ? new Date() : null });
      await writeAudit(ctx.user.id, `pastoralTask.${input.status}`, "pastoralTask", task.id, `牧養待辦狀態調整為 ${input.status}`);
    }),
  }),
  people: router({
    households: protectedProcedure.query(({ ctx }) => { requireAdmin(ctx.user.role); return db.listHouseholds(); }),
    createHousehold: protectedProcedure.input(z.object({ name: z.string().trim().min(1).max(120), primaryPhone: z.string().trim().max(64).nullable().optional(), notes: optionalText, status: z.enum(["active", "inactive"]).default("active") })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role); const id = await db.createHousehold(input); await writeAudit(ctx.user.id, "household.create", "household", id, `建立家庭主檔：${input.name}`); return id;
    }),
    updateHousehold: protectedProcedure.input(z.object({ id: z.number().int().positive(), name: z.string().trim().min(1).max(120).optional(), primaryPhone: z.string().trim().max(64).nullable().optional(), notes: optionalText, status: z.enum(["active", "inactive"]).optional() })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role); const { id, ...data } = input; await db.updateHousehold(id, data); await writeAudit(ctx.user.id, "household.update", "household", id, "更新家庭主檔摘要");
    }),
    list: protectedProcedure.query(({ ctx }) => { requireAdmin(ctx.user.role); return db.listPeople(); }),
    duplicates: protectedProcedure.input(z.object({ fullName: z.string().trim().min(1).max(120), email: z.string().trim().email().max(320).nullable().optional(), phone: z.string().trim().max(64).nullable().optional(), excludeId: z.number().int().positive().optional() })).query(({ ctx, input }) => {
      requireAdmin(ctx.user.role); return db.findPersonDuplicates(input);
    }),
    create: protectedProcedure.input(z.object({ fullName: z.string().trim().min(1).max(120), email: z.string().trim().email().max(320).nullable().optional(), phone: z.string().trim().max(64).nullable().optional(), householdId: z.number().int().positive().nullable().optional(), status: z.enum(["active", "inactive"]).default("active"), allowPossibleDuplicate: z.boolean().default(false) })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role); const duplicates = await db.findPersonDuplicates(input); if (duplicates.length && !input.allowPossibleDuplicate) throw new TRPCError({ code: "CONFLICT", message: `發現 ${duplicates.length} 筆可能重複的人員，請先確認後再建立。` });
      const { allowPossibleDuplicate, ...data } = input; const id = await db.createPerson(data); await writeAudit(ctx.user.id, "person.create", "person", id, `建立人員主檔：${input.fullName}`); return id;
    }),
    update: protectedProcedure.input(z.object({ id: z.number().int().positive(), fullName: z.string().trim().min(1).max(120).optional(), email: z.string().trim().email().max(320).nullable().optional(), phone: z.string().trim().max(64).nullable().optional(), householdId: z.number().int().positive().nullable().optional(), status: z.enum(["active", "inactive"]).optional(), allowPossibleDuplicate: z.boolean().default(false) })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role); const existing = await db.getPersonById(input.id); if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "找不到指定人員。" });
      const candidate = { fullName: input.fullName ?? existing.fullName, email: input.email === undefined ? existing.email : input.email, phone: input.phone === undefined ? existing.phone : input.phone, excludeId: input.id }; const duplicates = await db.findPersonDuplicates(candidate); if (duplicates.length && !input.allowPossibleDuplicate) throw new TRPCError({ code: "CONFLICT", message: `發現 ${duplicates.length} 筆可能重複的人員，請先確認後再儲存。` });
      const { id, allowPossibleDuplicate, ...data } = input; await db.updatePerson(id, data); await writeAudit(ctx.user.id, "person.update", "person", id, "更新人員主檔摘要");
    }),
    groupMembersForLink: protectedProcedure.query(({ ctx }) => { requireAdmin(ctx.user.role); return db.listGroupMembersForPersonLink(); }),
    linkGroupMember: protectedProcedure.input(z.object({ groupMemberId: z.number().int().positive(), personId: z.number().int().positive().nullable() })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role); const member = await db.getGroupMemberById(input.groupMemberId); if (!member) throw new TRPCError({ code: "NOT_FOUND", message: "找不到小組成員。" }); if (input.personId && !await db.getPersonById(input.personId)) throw new TRPCError({ code: "NOT_FOUND", message: "找不到指定人員主檔。" });
      await db.updateGroupMemberPersonLink(input.groupMemberId, input.personId); await writeAudit(ctx.user.id, input.personId ? "groupMember.person.link" : "groupMember.person.unlink", "groupMember", input.groupMemberId, input.personId ? `連結人員主檔 #${input.personId}` : "解除人員主檔連結");
    }),
  }),
  activities: router({
    events: protectedProcedure.query(({ ctx }) => db.listEvents(ctx.user.role === "Member")),
    registrationSummary: protectedProcedure.query(({ ctx }) => { requireAdmin(ctx.user.role); return db.listEventRegistrationSummaries(); }),
    createEvent: protectedProcedure.input(z.object({ title: z.string().trim().min(1).max(180), description: optionalText, location: z.string().trim().max(180).nullable().optional(), capacity: z.number().int().positive().nullable().optional(), startsAt: z.number().int().positive(), endsAt: z.number().int().positive().nullable().optional(), isPublished: z.boolean().default(true), groupIds: z.array(z.number().int().positive()).default([]) })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      const { groupIds, startsAt, endsAt, ...data } = input;
      const id = await db.createEvent({ ...data, startsAt: new Date(startsAt), endsAt: endsAt ? new Date(endsAt) : null, createdBy: ctx.user.id }, groupIds);
      await writeAudit(ctx.user.id, "event.create", "event", id, `建立活動：${data.title}`);
      return id;
    }),
    registrations: protectedProcedure.input(z.object({ eventId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role); return db.listEventRegistrations(input.eventId);
    }),
    register: protectedProcedure.input(z.object({ eventId: z.number().int().positive(), personId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role); const [event, person] = await Promise.all([db.getEventById(input.eventId), db.getPersonById(input.personId)]);
      if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "找不到指定活動。" }); if (!person) throw new TRPCError({ code: "NOT_FOUND", message: "找不到指定人員。" });
      const existing = await db.getEventRegistration(input.eventId, input.personId); if (existing?.status === "registered" || existing?.status === "waitlisted") return { status: existing.status, unchanged: true };
      const activeRegistrations = await db.countActiveEventRegistrations(input.eventId); const status = resolveRegistrationStatus(event.capacity, activeRegistrations);
      await db.upsertEventRegistration(input.eventId, input.personId, status); await writeAudit(ctx.user.id, "event.registration.create", "event", input.eventId, `${person.fullName} 報名，狀態：${status}`); return { status, unchanged: false };
    }),
    cancelRegistration: protectedProcedure.input(z.object({ eventId: z.number().int().positive(), personId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role); const registration = await db.getEventRegistration(input.eventId, input.personId); if (!registration || registration.status === "cancelled") throw new TRPCError({ code: "NOT_FOUND", message: "找不到有效報名紀錄。" });
      await db.cancelEventRegistration(input.eventId, input.personId); await writeAudit(ctx.user.id, "event.registration.cancel", "event", input.eventId, `取消人員 #${input.personId} 的活動報名`);
    }),
    checkIn: protectedProcedure.input(z.object({ eventId: z.number().int().positive(), personId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role); const registration = await db.getEventRegistration(input.eventId, input.personId); if (!registration || !canCheckIn(registration.status)) throw new TRPCError({ code: "BAD_REQUEST", message: "僅已報名的人員可以簽到。" });
      await db.checkInEventRegistration(input.eventId, input.personId); await writeAudit(ctx.user.id, "event.registration.checkIn", "event", input.eventId, `人員 #${input.personId} 完成簽到`);
    }),
    announcements: protectedProcedure.query(({ ctx }) => db.listAnnouncements(ctx.user.role === "Member")),
    createAnnouncement: protectedProcedure.input(z.object({ title: z.string().trim().min(1).max(180), content: z.string().trim().min(1).max(10000), isPublished: z.boolean().default(true), groupIds: z.array(z.number().int().positive()).default([]) })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      const { groupIds, ...data } = input;
      const id = await db.createAnnouncement({ ...data, createdBy: ctx.user.id, publishedAt: input.isPublished ? new Date() : null }, groupIds);
      await writeAudit(ctx.user.id, "announcement.create", "announcement", id, `發布公告：${data.title}`);
      return id;
    }),
  }),
  rollout: router({
    readiness: protectedProcedure.query(({ ctx }) => { requireAdmin(ctx.user.role); return db.getRolloutReadiness(); }),
  }),
});

export type AppRouter = typeof appRouter;
