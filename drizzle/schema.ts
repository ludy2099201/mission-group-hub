import {
  boolean,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const userRoles = ["Admin", "Leader", "Member"] as const;
export const missionaryStatuses = ["active", "inactive"] as const;
export const prayerStatuses = ["praying", "answered"] as const;
export const commitmentFrequencies = ["monthly", "quarterly", "yearly", "one_time"] as const;
export const commitmentStatuses = ["active", "paused", "ended"] as const;
export const attendanceStatuses = ["attended", "absent", "excused"] as const;
export const careMethods = ["phone", "visit", "message", "meeting", "other"] as const;
export const followUpStatuses = ["none", "pending", "completed"] as const;

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", userRoles).default("Member").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const missionaries = mysqlTable("missionaries", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  ministryRegion: varchar("ministryRegion", { length: 180 }).notNull(),
  sendingOrganization: varchar("sendingOrganization", { length: 180 }).notNull(),
  contactEmail: varchar("contactEmail", { length: 320 }),
  contactPhone: varchar("contactPhone", { length: 64 }),
  photoUrl: varchar("photoUrl", { length: 1024 }),
  status: mysqlEnum("status", missionaryStatuses).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const supporters = mysqlTable("supporters", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 64 }),
  notes: text("notes"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const supportCommitments = mysqlTable("supportCommitments", {
  id: int("id").autoincrement().primaryKey(),
  missionaryId: int("missionaryId").notNull().references(() => missionaries.id),
  supporterId: int("supporterId").notNull().references(() => supporters.id),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 8 }).default("TWD").notNull(),
  frequency: mysqlEnum("frequency", commitmentFrequencies).default("monthly").notNull(),
  status: mysqlEnum("status", commitmentStatuses).default("active").notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("supportCommitments_missionary_idx").on(table.missionaryId),
  index("supportCommitments_supporter_idx").on(table.supporterId),
]);

export const prayerRequests = mysqlTable("prayerRequests", {
  id: int("id").autoincrement().primaryKey(),
  missionaryId: int("missionaryId").notNull().references(() => missionaries.id),
  title: varchar("title", { length: 180 }).notNull(),
  content: text("content").notNull(),
  status: mysqlEnum("status", prayerStatuses).default("praying").notNull(),
  isArchived: boolean("isArchived").default(false).notNull(),
  answeredAt: timestamp("answeredAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("prayerRequests_missionary_idx").on(table.missionaryId)]);

export const groups = mysqlTable("groups", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  district: varchar("district", { length: 120 }).notNull(),
  leaderUserId: int("leaderUserId").references(() => users.id),
  description: text("description"),
  status: mysqlEnum("status", missionaryStatuses).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("groups_leader_idx").on(table.leaderUserId)]);

export const groupMembers = mysqlTable("groupMembers", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull().references(() => groups.id),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 64 }),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("groupMembers_group_idx").on(table.groupId)]);

export const groupMeetings = mysqlTable("groupMeetings", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull().references(() => groups.id),
  title: varchar("title", { length: 180 }).notNull(),
  heldAt: timestamp("heldAt").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("groupMeetings_group_idx").on(table.groupId)]);

export const attendanceRecords = mysqlTable("attendanceRecords", {
  id: int("id").autoincrement().primaryKey(),
  meetingId: int("meetingId").notNull().references(() => groupMeetings.id),
  groupMemberId: int("groupMemberId").notNull().references(() => groupMembers.id),
  status: mysqlEnum("status", attendanceStatuses).default("attended").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("attendance_meeting_member_unique").on(table.meetingId, table.groupMemberId),
  index("attendance_meeting_idx").on(table.meetingId),
]);

export const careLogs = mysqlTable("careLogs", {
  id: int("id").autoincrement().primaryKey(),
  groupMemberId: int("groupMemberId").notNull().references(() => groupMembers.id),
  createdBy: int("createdBy").notNull().references(() => users.id),
  careDate: timestamp("careDate").notNull(),
  method: mysqlEnum("method", careMethods).notNull(),
  summary: text("summary").notNull(),
  followUpStatus: mysqlEnum("followUpStatus", followUpStatuses).default("none").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("careLogs_member_idx").on(table.groupMemberId)]);

export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 180 }).notNull(),
  description: text("description"),
  location: varchar("location", { length: 180 }),
  startsAt: timestamp("startsAt").notNull(),
  endsAt: timestamp("endsAt"),
  isPublished: boolean("isPublished").default(true).notNull(),
  createdBy: int("createdBy").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("events_startsAt_idx").on(table.startsAt)]);

export const eventGroups = mysqlTable("eventGroups", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull().references(() => events.id),
  groupId: int("groupId").notNull().references(() => groups.id),
}, (table) => [uniqueIndex("event_group_unique").on(table.eventId, table.groupId)]);

export const announcements = mysqlTable("announcements", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 180 }).notNull(),
  content: text("content").notNull(),
  isPublished: boolean("isPublished").default(true).notNull(),
  publishedAt: timestamp("publishedAt"),
  createdBy: int("createdBy").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const announcementGroups = mysqlTable("announcementGroups", {
  id: int("id").autoincrement().primaryKey(),
  announcementId: int("announcementId").notNull().references(() => announcements.id),
  groupId: int("groupId").notNull().references(() => groups.id),
}, (table) => [uniqueIndex("announcement_group_unique").on(table.announcementId, table.groupId)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
