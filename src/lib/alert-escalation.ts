/** Minutes without receipt before an escalation level is reached. Urgent notices (HIGH / EXTREME) escalate faster. */
export function escalationThresholds(priority: string) {
  return priority === "HIGH" || priority === "EXTREME" ? { retry: 5, level1: 5, level2: 15, ack: 10 } : { retry: 5, level1: 15, level2: 60, ack: 30 };
}

/** Escalation level a delivery has reached, from its state and the age of its alert. */
export function escalationLevelFor(input: { status: string; requiresAck: boolean; priority: string; ageMinutes: number }): 0 | 1 | 2 {
  const t = escalationThresholds(input.priority);
  if (input.status === "PENDING") return input.ageMinutes >= t.level2 ? 2 : input.ageMinutes >= t.level1 ? 1 : 0;
  if ((input.status === "DELIVERED" || input.status === "READ") && input.requiresAck) return input.ageMinutes >= t.ack * 2 ? 2 : input.ageMinutes >= t.ack ? 1 : 0;
  return 0;
}
