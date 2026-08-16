export type RegistrationStatus = "registered" | "waitlisted" | "cancelled";

export function resolveRegistrationStatus(capacity: number | null, activeRegistrations: number): "registered" | "waitlisted" {
  if (capacity === null || activeRegistrations < capacity) return "registered";
  return "waitlisted";
}

export function canCheckIn(status: RegistrationStatus) {
  return status === "registered";
}
