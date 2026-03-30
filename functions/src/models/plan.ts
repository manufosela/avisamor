import { type Timestamp } from "firebase-admin/firestore";

export interface PlanLimits {
  maxGroups: number; // -1 = unlimited
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

export const DEFAULT_PLAN_ID = "free";

export const SEED_PLANS: Omit<Plan, "active">[] = [
  {
    planId: "free",
    name: "Gratuito",
    priceMonthly: 0,
    limits: {
      maxGroups: 1,
      maxMembers: 5,
      maxBeacons: 3,
      supervisionPanel: false,
      adminPanel: false,
    },
    order: 1,
  },
  {
    planId: "familia",
    name: "Familia",
    priceMonthly: 3,
    limits: {
      maxGroups: 1,
      maxMembers: 10,
      maxBeacons: 10,
      supervisionPanel: true,
      adminPanel: false,
    },
    order: 2,
  },
  {
    planId: "residencia",
    name: "Residencia",
    priceMonthly: 20,
    limits: {
      maxGroups: -1,
      maxMembers: 50,
      maxBeacons: -1,
      supervisionPanel: true,
      adminPanel: true,
    },
    order: 3,
  },
];
