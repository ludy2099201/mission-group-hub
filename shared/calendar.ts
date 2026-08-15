export type CalendarEvent = { startsAt: Date | string | number };

export function eventsByDayOfMonth<T extends CalendarEvent>(events: T[], month: Date) {
  const days = new Map<number, T[]>();
  events.forEach(event => {
    const startsAt = new Date(event.startsAt);
    if (startsAt.getFullYear() !== month.getFullYear() || startsAt.getMonth() !== month.getMonth()) return;
    const day = startsAt.getDate();
    days.set(day, [...(days.get(day) ?? []), event]);
  });
  return days;
}
