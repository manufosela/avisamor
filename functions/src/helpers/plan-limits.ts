import { HttpsError } from "firebase-functions/v2/https";
import type { Firestore } from "firebase-admin/firestore";
import type { Plan, PlanLimits } from "../models/index.js";
import { DEFAULT_PLAN_ID } from "../models/index.js";

type LimitResource = "members" | "beacons" | "groups";

async function getPlan(db: Firestore, planId: string): Promise<Plan> {
  const planDoc = await db.collection("plans").doc(planId).get();
  if (planDoc.exists) {
    return planDoc.data() as Plan;
  }

  if (planId !== DEFAULT_PLAN_ID) {
    const defaultDoc = await db.collection("plans").doc(DEFAULT_PLAN_ID).get();
    if (defaultDoc.exists) {
      return defaultDoc.data() as Plan;
    }
  }

  throw new HttpsError(
    "failed-precondition",
    "La plataforma no está configurada. El administrador debe crear los planes desde el panel de admin."
  );
}

async function getGroupPlanId(db: Firestore, groupId: string): Promise<string> {
  const groupDoc = await db.collection("groups").doc(groupId).get();
  if (!groupDoc.exists) {
    throw new HttpsError("not-found", "Group not found");
  }
  return groupDoc.data()?.planId || DEFAULT_PLAN_ID;
}

async function countResource(
  db: Firestore,
  groupId: string,
  resource: LimitResource
): Promise<number> {
  let snapshot;
  switch (resource) {
    case "members":
      snapshot = await db
        .collection("groupMembers")
        .where("groupId", "==", groupId)
        .count()
        .get();
      return snapshot.data().count;
    case "beacons":
      snapshot = await db
        .collection("beacons")
        .where("groupId", "==", groupId)
        .where("active", "==", true)
        .count()
        .get();
      return snapshot.data().count;
    case "groups":
      snapshot = await db
        .collection("groups")
        .where("createdBy", "==", groupId)
        .count()
        .get();
      return snapshot.data().count;
    default:
      return 0;
  }
}

function getLimitForResource(limits: PlanLimits, resource: LimitResource): number {
  switch (resource) {
    case "members":
      return limits.maxMembers;
    case "beacons":
      return limits.maxBeacons;
    case "groups":
      return limits.maxGroups;
  }
}

const RESOURCE_LABELS: Record<LimitResource, string> = {
  members: "miembros",
  beacons: "beacons",
  groups: "grupos",
};

export async function validatePlanLimit(
  db: Firestore,
  groupIdOrOwnerUid: string,
  resource: LimitResource,
  planId?: string
): Promise<void> {
  const resolvedPlanId = planId || await getGroupPlanId(db, groupIdOrOwnerUid);
  const plan = await getPlan(db, resolvedPlanId);
  const limit = getLimitForResource(plan.limits, resource);

  if (limit === -1) return;

  const current = await countResource(db, groupIdOrOwnerUid, resource);

  if (current >= limit) {
    throw new HttpsError(
      "resource-exhausted",
      `Plan ${plan.name}: límite de ${limit} ${RESOURCE_LABELS[resource]} alcanzado. Mejora tu plan para añadir más.`
    );
  }
}

export async function checkGroupNotBlocked(
  db: Firestore,
  groupId: string
): Promise<void> {
  const groupDoc = await db.collection("groups").doc(groupId).get();
  if (!groupDoc.exists) {
    throw new HttpsError("not-found", "Group not found");
  }
  if (groupDoc.data()?.blocked === true) {
    throw new HttpsError(
      "permission-denied",
      `Grupo bloqueado: ${groupDoc.data()?.blockedReason || "contacta con soporte"}`
    );
  }
}
