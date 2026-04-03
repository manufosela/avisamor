import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

function requireAdmin(request: { auth?: { uid: string; token?: Record<string, unknown> } }) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  if (request.auth.token?.admin !== true) {
    throw new HttpsError("permission-denied", "Admin access required");
  }
}

export const setAdminClaim = onCall(
  { region: "europe-west1" },
  async (request) => {
    requireAdmin(request);

    const { targetUid } = request.data as { targetUid?: string };
    if (!targetUid) {
      throw new HttpsError("invalid-argument", "targetUid is required");
    }

    await getAuth().setCustomUserClaims(targetUid, { admin: true });

    const db = getFirestore();
    await db.collection("adminUsers").doc(targetUid).set({
      uid: targetUid,
      role: "support",
      createdAt: FieldValue.serverTimestamp(),
      createdBy: request.auth!.uid,
    });

    return { success: true };
  }
);

export const adminListGroups = onCall(
  { region: "europe-west1" },
  async (request) => {
    requireAdmin(request);

    const db = getFirestore();
    const groupsSnap = await db.collection("groups").orderBy("createdAt", "desc").limit(100).get();

    const groups = await Promise.all(
      groupsSnap.docs.map(async (doc) => {
        const data = doc.data();
        const groupId = data.groupId as string;

        const membersCount = (
          await db.collection("groupMembers").where("groupId", "==", groupId).count().get()
        ).data().count;

        const beaconsCount = (
          await db
            .collection("beacons")
            .where("groupId", "==", groupId)
            .where("active", "==", true)
            .count()
            .get()
        ).data().count;

        let lastAlertAt = null;
        try {
          const lastAlert = await db
            .collection("alerts")
            .where("groupId", "==", groupId)
            .orderBy("createdAt", "desc")
            .limit(1)
            .get();
          lastAlertAt = lastAlert.empty ? null : lastAlert.docs[0].data().createdAt;
        } catch {
          // Index may not exist yet, skip
        }

        return {
          groupId,
          name: data.name,
          planId: data.planId || "free",
          blocked: data.blocked || false,
          createdBy: data.createdBy,
          createdAt: data.createdAt,
          membersCount,
          beaconsCount,
          lastAlertAt,
        };
      })
    );

    return { groups };
  }
);

export const adminGetDashboard = onCall(
  { region: "europe-west1" },
  async (request) => {
    requireAdmin(request);

    const db = getFirestore();

    const totalGroups = (await db.collection("groups").count().get()).data().count;
    const totalMembers = (await db.collection("groupMembers").count().get()).data().count;
    const totalBeacons = (
      await db.collection("beacons").where("active", "==", true).count().get()
    ).data().count;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

    const alertsToday = (
      await db.collection("alerts").where("createdAt", ">=", todayStart).count().get()
    ).data().count;

    const alertsWeek = (
      await db.collection("alerts").where("createdAt", ">=", weekStart).count().get()
    ).data().count;

    const totalAlerts = (await db.collection("alerts").count().get()).data().count +
      (await db.collection("alertHistory").count().get()).data().count;

    return {
      totalGroups,
      totalMembers,
      totalBeacons,
      alertsToday,
      alertsWeek,
      totalAlerts,
    };
  }
);

export const adminUpdateGroup = onCall(
  { region: "europe-west1" },
  async (request) => {
    requireAdmin(request);

    const { groupId, planId, blocked, blockedReason } = request.data as {
      groupId?: string;
      planId?: string;
      blocked?: boolean;
      blockedReason?: string;
    };

    if (!groupId) {
      throw new HttpsError("invalid-argument", "groupId is required");
    }

    const db = getFirestore();
    const groupRef = db.collection("groups").doc(groupId);
    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) {
      throw new HttpsError("not-found", "Group not found");
    }

    const updates: Record<string, unknown> = {};
    if (planId !== undefined) {
      const planDoc = await db.collection("plans").doc(planId).get();
      if (!planDoc.exists) {
        throw new HttpsError("invalid-argument", "Plan not found");
      }
      updates.planId = planId;
    }
    if (blocked !== undefined) {
      updates.blocked = blocked;
      updates.blockedReason = blocked ? (blockedReason || null) : null;
    }

    if (Object.keys(updates).length === 0) {
      throw new HttpsError("invalid-argument", "No updates provided");
    }

    await groupRef.update(updates);

    return { success: true, groupId, updates };
  }
);

export const adminCheckSetup = onCall(
  { region: "europe-west1" },
  async (request) => {
    requireAdmin(request);
    const db = getFirestore();
    const plansSnap = await db.collection("plans").limit(1).get();
    return { setupComplete: !plansSnap.empty };
  }
);

export const adminCreatePlan = onCall(
  { region: "europe-west1" },
  async (request) => {
    requireAdmin(request);

    const { planId, name, priceMonthly, order, limits } = request.data as {
      planId?: string;
      name?: string;
      priceMonthly?: number;
      order?: number;
      limits?: {
        maxGroups?: number;
        maxMembers?: number;
        maxBeacons?: number;
        supervisionPanel?: boolean;
        adminPanel?: boolean;
      };
    };

    if (!planId || typeof planId !== "string") {
      throw new HttpsError("invalid-argument", "planId is required");
    }
    if (!name || typeof name !== "string") {
      throw new HttpsError("invalid-argument", "name is required");
    }
    if (priceMonthly === undefined || typeof priceMonthly !== "number") {
      throw new HttpsError("invalid-argument", "priceMonthly is required (number)");
    }
    if (!limits || typeof limits.maxMembers !== "number" || typeof limits.maxGroups !== "number" || typeof limits.maxBeacons !== "number") {
      throw new HttpsError("invalid-argument", "limits with maxGroups, maxMembers, maxBeacons required");
    }

    const db = getFirestore();
    const existing = await db.collection("plans").doc(planId).get();
    if (existing.exists) {
      throw new HttpsError("already-exists", `Plan "${planId}" already exists`);
    }

    const planData = {
      planId,
      name,
      priceMonthly,
      order: order ?? 0,
      active: true,
      limits: {
        maxGroups: limits.maxGroups,
        maxMembers: limits.maxMembers,
        maxBeacons: limits.maxBeacons,
        supervisionPanel: limits.supervisionPanel ?? false,
        adminPanel: limits.adminPanel ?? false,
      },
    };

    await db.collection("plans").doc(planId).set(planData);
    return { success: true, plan: planData };
  }
);

export const adminUpdatePlan = onCall(
  { region: "europe-west1" },
  async (request) => {
    requireAdmin(request);

    const { planId, ...updates } = request.data as {
      planId?: string;
      name?: string;
      priceMonthly?: number;
      order?: number;
      active?: boolean;
      limits?: {
        maxGroups?: number;
        maxMembers?: number;
        maxBeacons?: number;
        supervisionPanel?: boolean;
        adminPanel?: boolean;
      };
    };

    if (!planId) {
      throw new HttpsError("invalid-argument", "planId is required");
    }

    const db = getFirestore();
    const planRef = db.collection("plans").doc(planId);
    const planDoc = await planRef.get();

    if (!planDoc.exists) {
      throw new HttpsError("not-found", "Plan not found");
    }

    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.priceMonthly !== undefined) updateData.priceMonthly = updates.priceMonthly;
    if (updates.order !== undefined) updateData.order = updates.order;
    if (updates.active !== undefined) updateData.active = updates.active;
    if (updates.limits) {
      const current = planDoc.data()?.limits || {};
      updateData.limits = { ...current, ...updates.limits };
    }

    if (Object.keys(updateData).length === 0) {
      throw new HttpsError("invalid-argument", "No updates provided");
    }

    await planRef.update(updateData);
    return { success: true, planId };
  }
);
