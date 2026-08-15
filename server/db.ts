import { and, asc, desc, eq, gte, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  announcements,
  announcementGroups,
  attendanceRecords,
  careLogs,
  eventGroups,
  events,
  groupMembers,
  groupMeetings,
  groups,
  InsertUser,
  missionaries,
  prayerRequests,
  supporters,
  supportCommitments,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { calculateAttendanceSummary } from "./attendanceMetrics";

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
  return db.select({ id: users.id, name: users.name, email: users.email, role: users.role }).from(users).orderBy(asc(users.name));
}

export async function updateUserRole(userId: number, role: "Admin" | "Leader" | "Member") {
  const db = await requireDb();
  await db.update(users).set({ role }).where(eq(users.id, userId));
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
    createdAt: groups.createdAt,
  }).from(groups).leftJoin(users, eq(groups.leaderUserId, users.id)).orderBy(asc(groups.district), asc(groups.name));
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

export async function listEvents(publishedOnly = false) {
  const db = await requireDb();
  return publishedOnly
    ? db.select().from(events).where(eq(events.isPublished, true)).orderBy(asc(events.startsAt))
    : db.select().from(events).orderBy(asc(events.startsAt));
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
