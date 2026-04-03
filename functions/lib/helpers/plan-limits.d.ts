import type { Firestore } from "firebase-admin/firestore";
type LimitResource = "members" | "beacons" | "groups";
export declare function validatePlanLimit(db: Firestore, groupIdOrOwnerUid: string, resource: LimitResource, planId?: string): Promise<void>;
export declare function checkGroupNotBlocked(db: Firestore, groupId: string): Promise<void>;
export {};
//# sourceMappingURL=plan-limits.d.ts.map