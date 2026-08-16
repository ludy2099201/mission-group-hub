export type RolloutReadinessInput = {
  activeLeaders: number;
  groups: number;
  groupMembers: number;
  meetings: number;
  pendingCareLogs: number;
  recentAbsences: number;
  overdueTasks: number;
  todayTasks: number;
  upcomingTasks: number;
};

export function evaluateRolloutReadiness(input: RolloutReadinessInput) {
  return {
    taskClassification: input.overdueTasks > 0 && input.todayTasks > 0 && input.upcomingTasks > 0,
    leaderScope: input.activeLeaders > 0 && input.groups > 0 && input.groupMembers > 0,
    careSuggestions: input.pendingCareLogs > 0,
    absenceSuggestions: input.meetings > 0 && input.recentAbsences > 0,
  };
}
