import { classifyDueAt } from "./pastoralTasks";

export type PastoralTaskStatus = "open" | "completed" | "dismissed";
export type PastoralTaskViewItem = { status: PastoralTaskStatus; dueAt: Date | null };

export function filterPastoralTasks<T extends PastoralTaskViewItem>(tasks: T[], filter: "all" | PastoralTaskStatus): T[] {
  return filter === "all" ? tasks : tasks.filter(task => task.status === filter);
}

export function summarizeOpenPastoralTasks(tasks: PastoralTaskViewItem[], now: Date) {
  const summary = { overdue: 0, today: 0, upcoming: 0 };
  tasks.filter(task => task.status === "open").forEach(task => {
    const bucket = classifyDueAt(task.dueAt, now);
    if (bucket === "overdue" || bucket === "today" || bucket === "upcoming") summary[bucket] += 1;
  });
  return summary;
}
