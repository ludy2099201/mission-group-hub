export type AttendanceStatus = "attended" | "absent" | "excused";

export function calculateAttendanceSummary(statuses: AttendanceStatus[]) {
  const totalRecords = statuses.length;
  const attendedCount = statuses.filter(status => status === "attended").length;
  return {
    totalRecords,
    attendedCount,
    rate: totalRecords === 0 ? 0 : Math.round((attendedCount / totalRecords) * 100),
  };
}
