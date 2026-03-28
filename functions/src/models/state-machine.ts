import { AlertStatus } from "./alert.js";

export const VALID_TRANSITIONS = new Map<AlertStatus, AlertStatus[]>([
  [AlertStatus.ACTIVE, [AlertStatus.ACCEPTED, AlertStatus.CANCELLED, AlertStatus.EXPIRED]],
  [AlertStatus.ACCEPTED, [AlertStatus.RESOLVED, AlertStatus.CANCELLED]],
  [AlertStatus.RESOLVED, []],
  [AlertStatus.CANCELLED, []],
  [AlertStatus.EXPIRED, []],
]);

export function isValidTransition(from: AlertStatus, to: AlertStatus): boolean {
  const allowed = VALID_TRANSITIONS.get(from);
  return allowed !== undefined && allowed.includes(to);
}
