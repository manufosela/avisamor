import { type Timestamp } from "firebase-admin/firestore";
export interface PlanLimits {
    maxGroups: number;
    maxMembers: number;
    maxBeacons: number;
    supervisionPanel: boolean;
    adminPanel: boolean;
}
export interface Plan {
    planId: string;
    name: string;
    priceMonthly: number;
    limits: PlanLimits;
    active: boolean;
    order: number;
}
export type SubscriptionStatus = "active" | "trial" | "cancelled" | "expired";
export interface Subscription {
    groupId: string;
    planId: string;
    ownerUid: string;
    status: SubscriptionStatus;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}
export declare const DEFAULT_PLAN_ID = "free";
//# sourceMappingURL=plan.d.ts.map