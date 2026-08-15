export type MissionarySearchItem = {
  name: string;
  ministryRegion: string;
  sendingOrganization: string;
  contactEmail?: string | null;
  status: "active" | "inactive";
};

export function filterMissionaries<T extends MissionarySearchItem>(items: T[], searchTerm: string, status: "all" | "active" | "inactive") {
  const query = searchTerm.trim().toLocaleLowerCase("zh-TW");
  return items.filter(item => {
    const matchesQuery = !query || [item.name, item.ministryRegion, item.sendingOrganization, item.contactEmail].filter(Boolean).some(value => String(value).toLocaleLowerCase("zh-TW").includes(query));
    return matchesQuery && (status === "all" || item.status === status);
  });
}

export type PrayerFilterItem = { status: "praying" | "answered"; isArchived: boolean };

export function filterPrayers<T extends PrayerFilterItem>(items: T[], filter: "current" | "answered" | "archived") {
  return items.filter(item => filter === "archived" ? item.isArchived : !item.isArchived && (filter === "current" ? item.status === "praying" : item.status === "answered"));
}

export type GroupSearchItem = { name: string; district: string; leaderName?: string | null };

export function filterGroups<T extends GroupSearchItem>(items: T[], searchTerm: string) {
  const query = searchTerm.trim().toLocaleLowerCase("zh-TW");
  if (!query) return items;
  return items.filter(item => [item.name, item.district, item.leaderName].filter(Boolean).some(value => String(value).toLocaleLowerCase("zh-TW").includes(query)));
}

export type ActivitySearchItem = { title: string; location?: string | null; description?: string | null };

export function filterActivities<T extends ActivitySearchItem>(items: T[], searchTerm: string) {
  const query = searchTerm.trim().toLocaleLowerCase("zh-TW");
  if (!query) return items;
  return items.filter(item => [item.title, item.location, item.description].filter(Boolean).some(value => String(value).toLocaleLowerCase("zh-TW").includes(query)));
}
