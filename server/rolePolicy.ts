export const ROLE_LABELS = {
  Admin: "Admin",
  Leader: "Leader",
  Member: "Member",
} as const;

export type ChurchRole = keyof typeof ROLE_LABELS;

export type ChurchModule = "missionaries" | "supporters" | "prayers" | "groups" | "attendance" | "care" | "activities" | "announcements" | "permissions";

const accessMatrix: Record<ChurchRole, Record<ChurchModule, boolean>> = {
  Admin: { missionaries: true, supporters: true, prayers: true, groups: true, attendance: true, care: true, activities: true, announcements: true, permissions: true },
  Leader: { missionaries: true, supporters: false, prayers: true, groups: true, attendance: true, care: true, activities: true, announcements: true, permissions: false },
  Member: { missionaries: true, supporters: false, prayers: true, groups: false, attendance: false, care: false, activities: true, announcements: true, permissions: false },
};

export function canAccessModule(role: ChurchRole, module: ChurchModule) {
  return accessMatrix[role][module];
}

export function canManageChurch(role: ChurchRole) {
  return role === "Admin";
}

export function canLeadGroups(role: ChurchRole) {
  return role === "Admin" || role === "Leader";
}

export function canViewSensitiveGiving(role: ChurchRole) {
  return role === "Admin";
}
