import { and, asc, desc, eq, gte, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  auditLogs,
  announcements,
  announcementGroups,
  attendanceRecords,
  careLogs,
  eventGroups,
  eventRegistrations,
  events,
  groupMembers,
  groupMeetings,
  groups,
  InsertUser,
  missionaries,
  pastoralTasks,
  people,
  prayerRequests,
  supporters,
  supportCommitments,
  households,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { calculateAttendanceSummary } from "./attendanceMetrics";
import { evaluateRolloutReadiness } from "../shared/rolloutReadiness";
import { buildGroupSecurityReview } from "../shared/groupSecurityReview";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("資料庫暫時無法連線，請稍後再試。");
  return db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await requireDb();
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "Admin";
    updateSet.role = "Admin";
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function listUsers() {
  const db = await requireDb();
  return db.select({ id: users.id, name: users.name, email: users.email, role: users.role, isActive: users.isActive, deactivatedAt: users.deactivatedAt }).from(users).orderBy(asc(users.name));
}

export async function listActiveUsers() {
  const db = await requireDb();
  return db.select({ id: users.id, name: users.name, email: users.email, role: users.role }).from(users).where(eq(users.isActive, true)).orderBy(asc(users.name));
}

export async function updateUserRole(userId: number, role: "Admin" | "Leader" | "Member") {
  const db = await requireDb();
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function getUserById(id: number) {
  const db = await requireDb();
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0];
}

export async function updateUserStatus(userId: number, isActive: boolean) {
  const db = await requireDb();
  await db.update(users).set({ isActive, deactivatedAt: isActive ? null : new Date() }).where(eq(users.id, userId));
}

export async function countActiveAdmins() {
  const db = await requireDb();
  const rows = await db.select({ id: users.id }).from(users).where(and(eq(users.role, "Admin"), eq(users.isActive, true)));
  return rows.length;
}

export async function createAuditLog(input: { actorUserId: number; action: string; entityType: string; entityId?: string | null; summary: string }) {
  const db = await requireDb();
  await db.insert(auditLogs).values({ ...input, entityId: input.entityId ?? null });
}

export async function listAuditLogs(limit = 50) {
  const db = await requireDb();
  return db.select({
    id: auditLogs.id,
    action: auditLogs.action,
    entityType: auditLogs.entityType,
    entityId: auditLogs.entityId,
    summary: auditLogs.summary,
    createdAt: auditLogs.createdAt,
    actorName: users.name,
    actorEmail: users.email,
  }).from(auditLogs).innerJoin(users, eq(auditLogs.actorUserId, users.id)).orderBy(desc(auditLogs.createdAt)).limit(limit);
}

export async function listMissionaries() {
  const db = await requireDb();
  return db.select().from(missionaries).orderBy(desc(missionaries.createdAt));
}

export async function getMissionaryById(id: number) {
  const db = await requireDb();
  const rows = await db.select().from(missionaries).where(eq(missionaries.id, id)).limit(1);
  return rows[0];
}

export async function createMissionary(data: typeof missionaries.$inferInsert) {
  const db = await requireDb();
  const result = await db.insert(missionaries).values(data);
  return Number(result[0].insertId);
}

export async function updateMissionary(id: number, data: Partial<typeof missionaries.$inferInsert>) {
  const db = await requireDb();
  await db.update(missionaries).set({ ...data, updatedAt: new Date() }).where(eq(missionaries.id, id));
}

export async function listSupporters() {
  const db = await requireDb();
  return db.select().from(supporters).where(eq(supporters.isActive, true)).orderBy(asc(supporters.name));
}

export async function createSupporter(data: typeof supporters.$inferInsert) {
  const db = await requireDb();
  const result = await db.insert(supporters).values(data);
  return Number(result[0].insertId);
}

export async function listCommitmentsForMissionary(missionaryId: number) {
  const db = await requireDb();
  return db.select({
    id: supportCommitments.id,
    amount: supportCommitments.amount,
    currency: supportCommitments.currency,
    frequency: supportCommitments.frequency,
    status: supportCommitments.status,
    supporterName: supporters.name,
  }).from(supportCommitments).innerJoin(supporters, eq(supportCommitments.supporterId, supporters.id)).where(eq(supportCommitments.missionaryId, missionaryId)).orderBy(desc(supportCommitments.createdAt));
}

export async function createCommitment(data: typeof supportCommitments.$inferInsert) {
  const db = await requireDb();
  const result = await db.insert(supportCommitments).values(data);
  return Number(result[0].insertId);
}

export async function listPrayerRequests(missionaryId?: number) {
  const db = await requireDb();
  const query = db.select({
    id: prayerRequests.id,
    missionaryId: prayerRequests.missionaryId,
    missionaryName: missionaries.name,
    title: prayerRequests.title,
    content: prayerRequests.content,
    status: prayerRequests.status,
    isArchived: prayerRequests.isArchived,
    createdAt: prayerRequests.createdAt,
    updatedAt: prayerRequests.updatedAt,
  }).from(prayerRequests).innerJoin(missionaries, eq(prayerRequests.missionaryId, missionaries.id));
  return missionaryId ? query.where(eq(prayerRequests.missionaryId, missionaryId)).orderBy(desc(prayerRequests.createdAt)) : query.orderBy(desc(prayerRequests.createdAt));
}

export async function createPrayerRequest(data: typeof prayerRequests.$inferInsert) {
  const db = await requireDb();
  const result = await db.insert(prayerRequests).values(data);
  return Number(result[0].insertId);
}

export async function updatePrayerRequest(id: number, data: Partial<typeof prayerRequests.$inferInsert>) {
  const db = await requireDb();
  await db.update(prayerRequests).set({ ...data, updatedAt: new Date() }).where(eq(prayerRequests.id, id));
}

export async function listGroups() {
  const db = await requireDb();
  return db.select({
    id: groups.id,
    name: groups.name,
    district: groups.district,
    leaderUserId: groups.leaderUserId,
    leaderName: users.name,
    description: groups.description,
    status: groups.status,
    visibility: groups.visibility,
    createdAt: groups.createdAt,
  }).from(groups).leftJoin(users, eq(groups.leaderUserId, users.id)).orderBy(asc(groups.district), asc(groups.name));
}

export async function listPublicGroups() {
  const db = await requireDb();
  return db.select({
    id: groups.id,
    name: groups.name,
    district: groups.district,
    leaderUserId: groups.leaderUserId,
    leaderName: users.name,
    description: groups.description,
    status: groups.status,
    visibility: groups.visibility,
    createdAt: groups.createdAt,
  }).from(groups).leftJoin(users, eq(groups.leaderUserId, users.id)).where(and(eq(groups.status, "active"), eq(groups.visibility, "public"))).orderBy(asc(groups.district), asc(groups.name));
}

export async function getGroupSecurityReview() {
  const rows = await listGroups();
  return buildGroupSecurityReview(rows.map(row => ({ id: row.id, name: row.name, status: row.status, visibility: row.visibility, leaderUserId: row.leaderUserId })));
}

export async function getGroupById(id: number) {
  const db = await requireDb();
  const rows = await db.select().from(groups).where(eq(groups.id, id)).limit(1);
  return rows[0];
}

export async function createGroup(data: typeof groups.$inferInsert) {
  const db = await requireDb();
  const result = await db.insert(groups).values(data);
  return Number(result[0].insertId);
}

export async function updateGroup(id: number, data: Partial<typeof groups.$inferInsert>) {
  const db = await requireDb();
  await db.update(groups).set({ ...data, updatedAt: new Date() }).where(eq(groups.id, id));
}

export async function listGroupMembers(groupId: number) {
  const db = await requireDb();
  return db.select().from(groupMembers).where(eq(groupMembers.groupId, groupId)).orderBy(asc(groupMembers.name));
}

export async function getGroupMemberById(id: number) {
  const db = await requireDb();
  const rows = await db.select().from(groupMembers).where(eq(groupMembers.id, id)).limit(1);
  return rows[0];
}

export async function updateGroupMemberPersonLink(id: number, personId: number | null) {
  const db = await requireDb();
  await db.update(groupMembers).set({ personId, updatedAt: new Date() }).where(eq(groupMembers.id, id));
}

export async function listHouseholds() {
  const db = await requireDb();
  return db.select().from(households).orderBy(asc(households.name));
}

export async function createHousehold(data: typeof households.$inferInsert) {
  const db = await requireDb();
  const result = await db.insert(households).values(data);
  return Number(result[0].insertId);
}

export async function updateHousehold(id: number, data: Partial<typeof households.$inferInsert>) {
  const db = await requireDb();
  await db.update(households).set({ ...data, updatedAt: new Date() }).where(eq(households.id, id));
}

export async function listPeople() {
  const db = await requireDb();
  return db.select({
    id: people.id, fullName: people.fullName, email: people.email, phone: people.phone, householdId: people.householdId, status: people.status,
    householdName: households.name, createdAt: people.createdAt, updatedAt: people.updatedAt,
  }).from(people).leftJoin(households, eq(people.householdId, households.id)).orderBy(asc(people.fullName));
}

export async function getPersonById(id: number) {
  const db = await requireDb();
  const rows = await db.select().from(people).where(eq(people.id, id)).limit(1);
  return rows[0];
}

export async function createPerson(data: typeof people.$inferInsert) {
  const db = await requireDb();
  const result = await db.insert(people).values(data);
  return Number(result[0].insertId);
}

export async function updatePerson(id: number, data: Partial<typeof people.$inferInsert>) {
  const db = await requireDb();
  await db.update(people).set({ ...data, updatedAt: new Date() }).where(eq(people.id, id));
}

export async function findPersonDuplicates(input: { fullName: string; email?: string | null; phone?: string | null; excludeId?: number }) {
  const normalise = (value?: string | null) => value?.trim().toLocaleLowerCase("zh-TW") ?? "";
  const name = normalise(input.fullName); const email = normalise(input.email); const phone = normalise(input.phone).replaceAll(/\s|-/g, "");
  const rows = await listPeople();
  return rows.filter(person => person.id !== input.excludeId && (
    normalise(person.fullName) === name || (email && normalise(person.email) === email) || (phone && normalise(person.phone).replaceAll(/\s|-/g, "") === phone)
  ));
}

export async function listGroupMembersForPersonLink() {
  const db = await requireDb();
  return db.select({ id: groupMembers.id, name: groupMembers.name, email: groupMembers.email, phone: groupMembers.phone, personId: groupMembers.personId, groupId: groups.id, groupName: groups.name })
    .from(groupMembers).innerJoin(groups, eq(groupMembers.groupId, groups.id)).orderBy(asc(groups.name), asc(groupMembers.name));
}

export async function createGroupMember(data: typeof groupMembers.$inferInsert) {
  const db = await requireDb();
  const result = await db.insert(groupMembers).values(data);
  return Number(result[0].insertId);
}

export async function listMeetings(groupId: number) {
  const db = await requireDb();
  return db.select().from(groupMeetings).where(eq(groupMeetings.groupId, groupId)).orderBy(desc(groupMeetings.heldAt));
}

export async function getMeetingById(id: number) {
  const db = await requireDb();
  const rows = await db.select().from(groupMeetings).where(eq(groupMeetings.id, id)).limit(1);
  return rows[0];
}

export async function createMeeting(data: typeof groupMeetings.$inferInsert) {
  const db = await requireDb();
  const result = await db.insert(groupMeetings).values(data);
  return Number(result[0].insertId);
}

export async function listAttendance(meetingId: number) {
  const db = await requireDb();
  return db.select({ groupMemberId: attendanceRecords.groupMemberId, status: attendanceRecords.status }).from(attendanceRecords).where(eq(attendanceRecords.meetingId, meetingId));
}

export async function upsertAttendance(meetingId: number, memberId: number, status: "attended" | "absent" | "excused") {
  const db = await requireDb();
  await db.insert(attendanceRecords).values({ meetingId, groupMemberId: memberId, status }).onDuplicateKeyUpdate({ set: { status, updatedAt: new Date() } });
}

export async function getGroupAttendanceSummary(groupId: number) {
  const db = await requireDb();
  const [records, meetings] = await Promise.all([
    db.select({ status: attendanceRecords.status }).from(attendanceRecords).innerJoin(groupMeetings, eq(attendanceRecords.meetingId, groupMeetings.id)).where(eq(groupMeetings.groupId, groupId)),
    db.select({ id: groupMeetings.id }).from(groupMeetings).where(eq(groupMeetings.groupId, groupId)),
  ]);
  return { ...calculateAttendanceSummary(records.map(record => record.status)), meetingCount: meetings.length };
}

export async function listCareLogs(groupId: number) {
  const db = await requireDb();
  return db.select({
    id: careLogs.id,
    groupMemberId: careLogs.groupMemberId,
    memberName: groupMembers.name,
    careDate: careLogs.careDate,
    method: careLogs.method,
    summary: careLogs.summary,
    followUpStatus: careLogs.followUpStatus,
  }).from(careLogs).innerJoin(groupMembers, eq(careLogs.groupMemberId, groupMembers.id)).where(eq(groupMembers.groupId, groupId)).orderBy(desc(careLogs.careDate));
}

export async function createCareLog(data: typeof careLogs.$inferInsert) {
  const db = await requireDb();
  const result = await db.insert(careLogs).values(data);
  return Number(result[0].insertId);
}

export async function getPastoralTaskById(id: number) {
  const db = await requireDb();
  const rows = await db.select().from(pastoralTasks).where(eq(pastoralTasks.id, id)).limit(1);
  return rows[0];
}

export async function createPastoralTask(data: typeof pastoralTasks.$inferInsert) {
  const db = await requireDb();
  const result = await db.insert(pastoralTasks).values(data);
  return Number(result[0].insertId);
}

export async function updatePastoralTask(id: number, data: Partial<typeof pastoralTasks.$inferInsert>) {
  const db = await requireDb();
  await db.update(pastoralTasks).set({ ...data, updatedAt: new Date() }).where(eq(pastoralTasks.id, id));
}

export async function listPastoralTasks(user: { id: number; role: "Admin" | "Leader" | "Member" }) {
  const db = await requireDb();
  const query = db.select({
    id: pastoralTasks.id, type: pastoralTasks.type, title: pastoralTasks.title, detail: pastoralTasks.detail, dueAt: pastoralTasks.dueAt,
    priority: pastoralTasks.priority, status: pastoralTasks.status, completedAt: pastoralTasks.completedAt, groupId: pastoralTasks.groupId,
    groupMemberId: pastoralTasks.groupMemberId, missionaryId: pastoralTasks.missionaryId, prayerRequestId: pastoralTasks.prayerRequestId,
    assignedToUserId: pastoralTasks.assignedToUserId, assignedToName: users.name, groupName: groups.name, memberName: groupMembers.name,
    missionaryName: missionaries.name, createdAt: pastoralTasks.createdAt,
  }).from(pastoralTasks)
    .innerJoin(users, eq(pastoralTasks.assignedToUserId, users.id))
    .leftJoin(groups, eq(pastoralTasks.groupId, groups.id))
    .leftJoin(groupMembers, eq(pastoralTasks.groupMemberId, groupMembers.id))
    .leftJoin(missionaries, eq(pastoralTasks.missionaryId, missionaries.id));
  const rows = user.role === "Admin" ? await query.orderBy(asc(pastoralTasks.dueAt), desc(pastoralTasks.createdAt)) : await query.where(eq(pastoralTasks.assignedToUserId, user.id)).orderBy(asc(pastoralTasks.dueAt), desc(pastoralTasks.createdAt));
  return rows;
}

export async function listCareFollowupSuggestions(leaderUserId?: number) {
  const db = await requireDb();
  const query = db.select({ id: careLogs.id, memberId: groupMembers.id, memberName: groupMembers.name, groupId: groups.id, groupName: groups.name, careDate: careLogs.careDate, summary: careLogs.summary })
    .from(careLogs).innerJoin(groupMembers, eq(careLogs.groupMemberId, groupMembers.id)).innerJoin(groups, eq(groupMembers.groupId, groups.id));
  return leaderUserId === undefined ? query.where(eq(careLogs.followUpStatus, "pending")).orderBy(desc(careLogs.careDate)) : query.where(and(eq(careLogs.followUpStatus, "pending"), eq(groups.leaderUserId, leaderUserId))).orderBy(desc(careLogs.careDate));
}

export async function listPrayerFollowupSuggestions() {
  const db = await requireDb();
  return db.select({ id: prayerRequests.id, missionaryId: missionaries.id, missionaryName: missionaries.name, title: prayerRequests.title, updatedAt: prayerRequests.updatedAt })
    .from(prayerRequests).innerJoin(missionaries, eq(prayerRequests.missionaryId, missionaries.id))
    .where(and(eq(prayerRequests.status, "praying"), eq(prayerRequests.isArchived, false))).orderBy(desc(prayerRequests.updatedAt));
}

export async function listRecentAbsenceRecords(leaderUserId?: number) {
  const db = await requireDb();
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
  const query = db.select({ memberId: groupMembers.id, memberName: groupMembers.name, groupId: groups.id, groupName: groups.name, heldAt: groupMeetings.heldAt })
    .from(attendanceRecords).innerJoin(groupMeetings, eq(attendanceRecords.meetingId, groupMeetings.id)).innerJoin(groups, eq(groupMeetings.groupId, groups.id)).innerJoin(groupMembers, eq(attendanceRecords.groupMemberId, groupMembers.id));
  return leaderUserId === undefined ? query.where(and(eq(attendanceRecords.status, "absent"), gte(groupMeetings.heldAt, cutoff))) : query.where(and(eq(attendanceRecords.status, "absent"), gte(groupMeetings.heldAt, cutoff), eq(groups.leaderUserId, leaderUserId)));
}

export async function getRolloutReadiness() {
  const db = await requireDb();
  const now = new Date(); const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()); const endOfToday = new Date(startOfToday); endOfToday.setDate(endOfToday.getDate() + 1); const endOfUpcoming = new Date(endOfToday); endOfUpcoming.setDate(endOfUpcoming.getDate() + 7); const absenceCutoff = new Date(now); absenceCutoff.setDate(absenceCutoff.getDate() - 30);
  const [leaders, groupRows, memberRows, meetingRows, careRows, absenceRows, taskRows] = await Promise.all([
    db.select({ id: users.id }).from(users).where(and(eq(users.role, "Leader"), eq(users.isActive, true))),
    db.select({ id: groups.id }).from(groups).where(eq(groups.status, "active")),
    db.select({ id: groupMembers.id }).from(groupMembers),
    db.select({ id: groupMeetings.id }).from(groupMeetings),
    db.select({ id: careLogs.id }).from(careLogs).where(eq(careLogs.followUpStatus, "pending")),
    db.select({ id: attendanceRecords.id }).from(attendanceRecords).innerJoin(groupMeetings, eq(attendanceRecords.meetingId, groupMeetings.id)).where(and(eq(attendanceRecords.status, "absent"), gte(groupMeetings.heldAt, absenceCutoff))),
    db.select({ dueAt: pastoralTasks.dueAt }).from(pastoralTasks).where(eq(pastoralTasks.status, "open")),
  ]);
  const overdueTasks = taskRows.filter(task => task.dueAt && task.dueAt < startOfToday).length; const todayTasks = taskRows.filter(task => task.dueAt && task.dueAt >= startOfToday && task.dueAt < endOfToday).length; const upcomingTasks = taskRows.filter(task => task.dueAt && task.dueAt >= endOfToday && task.dueAt < endOfUpcoming).length;
  const input = { activeLeaders: leaders.length, groups: groupRows.length, groupMembers: memberRows.length, meetings: meetingRows.length, pendingCareLogs: careRows.length, recentAbsences: absenceRows.length, overdueTasks, todayTasks, upcomingTasks };
  return { input, checks: evaluateRolloutReadiness(input) };
}

export async function listEvents(publishedOnly = false) {
  const db = await requireDb();
  return publishedOnly
    ? db.select().from(events).where(eq(events.isPublished, true)).orderBy(asc(events.startsAt))
    : db.select().from(events).orderBy(asc(events.startsAt));
}

export async function getEventById(id: number) {
  const db = await requireDb();
  const rows = await db.select().from(events).where(eq(events.id, id)).limit(1);
  return rows[0];
}

export async function listEventRegistrations(eventId: number) {
  const db = await requireDb();
  return db.select({ id: eventRegistrations.id, personId: people.id, personName: people.fullName, personEmail: people.email, personPhone: people.phone, status: eventRegistrations.status, checkedInAt: eventRegistrations.checkedInAt, createdAt: eventRegistrations.createdAt })
    .from(eventRegistrations).innerJoin(people, eq(eventRegistrations.personId, people.id)).where(eq(eventRegistrations.eventId, eventId)).orderBy(asc(eventRegistrations.createdAt));
}

export async function countActiveEventRegistrations(eventId: number) {
  const db = await requireDb();
  const rows = await db.select({ id: eventRegistrations.id }).from(eventRegistrations).where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.status, "registered")));
  return rows.length;
}

export async function listEventRegistrationSummaries() {
  const db = await requireDb();
  const rows = await db.select({ eventId: eventRegistrations.eventId, status: eventRegistrations.status }).from(eventRegistrations);
  const summaries = new Map<number, { eventId: number; registered: number; waitlisted: number; cancelled: number }>();
  rows.forEach(row => {
    const summary = summaries.get(row.eventId) ?? { eventId: row.eventId, registered: 0, waitlisted: 0, cancelled: 0 };
    summary[row.status] += 1; summaries.set(row.eventId, summary);
  });
  return Array.from(summaries.values());
}

export async function getEventRegistration(eventId: number, personId: number) {
  const db = await requireDb();
  const rows = await db.select().from(eventRegistrations).where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.personId, personId))).limit(1);
  return rows[0];
}

export async function upsertEventRegistration(eventId: number, personId: number, status: "registered" | "waitlisted") {
  const db = await requireDb();
  await db.insert(eventRegistrations).values({ eventId, personId, status, checkedInAt: null }).onDuplicateKeyUpdate({ set: { status, checkedInAt: null, updatedAt: new Date() } });
}

export async function cancelEventRegistration(eventId: number, personId: number) {
  const db = await requireDb();
  await db.update(eventRegistrations).set({ status: "cancelled", checkedInAt: null, updatedAt: new Date() }).where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.personId, personId)));
}

export async function checkInEventRegistration(eventId: number, personId: number) {
  const db = await requireDb();
  await db.update(eventRegistrations).set({ checkedInAt: new Date(), updatedAt: new Date() }).where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.personId, personId), eq(eventRegistrations.status, "registered")));
}

export async function createEvent(data: typeof events.$inferInsert, groupIds: number[]) {
  const db = await requireDb();
  const result = await db.insert(events).values(data);
  const eventId = Number(result[0].insertId);
  if (groupIds.length) await db.insert(eventGroups).values(groupIds.map(groupId => ({ eventId, groupId })));
  return eventId;
}

export async function listAnnouncements(publishedOnly = false) {
  const db = await requireDb();
  return publishedOnly
    ? db.select().from(announcements).where(eq(announcements.isPublished, true)).orderBy(desc(announcements.publishedAt))
    : db.select().from(announcements).orderBy(desc(announcements.createdAt));
}

export async function createAnnouncement(data: typeof announcements.$inferInsert, groupIds: number[]) {
  const db = await requireDb();
  const result = await db.insert(announcements).values(data);
  const announcementId = Number(result[0].insertId);
  if (groupIds.length) await db.insert(announcementGroups).values(groupIds.map(groupId => ({ announcementId, groupId })));
  return announcementId;
}

export const exportResources = ["missionaries", "supportCommitments", "prayers", "groups", "groupMembers", "attendance", "careLogs", "events", "announcements"] as const;
export type ExportResource = (typeof exportResources)[number];

export async function getExportRows(resource: ExportResource): Promise<Record<string, unknown>[]> {
  const db = await requireDb();
  switch (resource) {
    case "missionaries": return (await db.select().from(missionaries).orderBy(asc(missionaries.name))) as Record<string, unknown>[];
    case "supportCommitments": return (await db.select({ id: supportCommitments.id, missionaryName: missionaries.name, supporterName: supporters.name, amount: supportCommitments.amount, currency: supportCommitments.currency, frequency: supportCommitments.frequency, status: supportCommitments.status, startedAt: supportCommitments.startedAt, createdAt: supportCommitments.createdAt }).from(supportCommitments).innerJoin(missionaries, eq(supportCommitments.missionaryId, missionaries.id)).innerJoin(supporters, eq(supportCommitments.supporterId, supporters.id)).orderBy(desc(supportCommitments.createdAt))) as Record<string, unknown>[];
    case "prayers": return (await listPrayerRequests()) as Record<string, unknown>[];
    case "groups": return (await listGroups()) as Record<string, unknown>[];
    case "groupMembers": return (await db.select({ id: groupMembers.id, groupName: groups.name, name: groupMembers.name, email: groupMembers.email, phone: groupMembers.phone, joinedAt: groupMembers.joinedAt }).from(groupMembers).innerJoin(groups, eq(groupMembers.groupId, groups.id)).orderBy(asc(groups.name), asc(groupMembers.name))) as Record<string, unknown>[];
    case "attendance": return (await db.select({ id: attendanceRecords.id, groupName: groups.name, meetingTitle: groupMeetings.title, heldAt: groupMeetings.heldAt, memberName: groupMembers.name, status: attendanceRecords.status, createdAt: attendanceRecords.createdAt }).from(attendanceRecords).innerJoin(groupMeetings, eq(attendanceRecords.meetingId, groupMeetings.id)).innerJoin(groups, eq(groupMeetings.groupId, groups.id)).innerJoin(groupMembers, eq(attendanceRecords.groupMemberId, groupMembers.id)).orderBy(desc(groupMeetings.heldAt))) as Record<string, unknown>[];
    case "careLogs": return (await db.select({ id: careLogs.id, groupName: groups.name, memberName: groupMembers.name, careDate: careLogs.careDate, method: careLogs.method, summary: careLogs.summary, followUpStatus: careLogs.followUpStatus, createdAt: careLogs.createdAt }).from(careLogs).innerJoin(groupMembers, eq(careLogs.groupMemberId, groupMembers.id)).innerJoin(groups, eq(groupMembers.groupId, groups.id)).orderBy(desc(careLogs.careDate))) as Record<string, unknown>[];
    case "events": return (await db.select().from(events).orderBy(asc(events.startsAt))) as Record<string, unknown>[];
    case "announcements": return (await db.select().from(announcements).orderBy(desc(announcements.createdAt))) as Record<string, unknown>[];
  }
}

export async function getDashboardData() {
  const db = await requireDb();
  const [missionaryRows, prayerRows, attendanceRows, eventRows] = await Promise.all([
    db.select().from(missionaries),
    db.select().from(prayerRequests).where(and(eq(prayerRequests.status, "praying"), eq(prayerRequests.isArchived, false))),
    db.select({ status: attendanceRecords.status }).from(attendanceRecords),
    db.select().from(events).where(and(eq(events.isPublished, true), gte(events.startsAt, new Date()))).orderBy(asc(events.startsAt)).limit(4),
  ]);
  const attendanceRate = attendanceRows.length ? Math.round((attendanceRows.filter(row => row.status === "attended").length / attendanceRows.length) * 100) : 0;
  return {
    activeMissionaries: missionaryRows.filter(row => row.status === "active").length,
    prayerCount: prayerRows.length,
    attendanceRate,
    upcomingEvents: eventRows,
  };
}
