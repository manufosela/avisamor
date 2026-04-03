"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminUpdatePlan = exports.adminCreatePlan = exports.adminCheckSetup = exports.bumpVersion = exports.adminBumpVersion = exports.adminDeleteGroup = exports.adminUpdateGroup = exports.adminGetDashboard = exports.adminListGroups = exports.setAdminClaim = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("firebase-admin/auth");
function requireAdmin(request) {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required");
    }
    if (request.auth.token?.admin !== true) {
        throw new https_1.HttpsError("permission-denied", "Admin access required");
    }
}
exports.setAdminClaim = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    requireAdmin(request);
    const { targetUid } = request.data;
    if (!targetUid) {
        throw new https_1.HttpsError("invalid-argument", "targetUid is required");
    }
    await (0, auth_1.getAuth)().setCustomUserClaims(targetUid, { admin: true });
    const db = (0, firestore_1.getFirestore)();
    await db.collection("adminUsers").doc(targetUid).set({
        uid: targetUid,
        role: "support",
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        createdBy: request.auth.uid,
    });
    return { success: true };
});
exports.adminListGroups = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    requireAdmin(request);
    const db = (0, firestore_1.getFirestore)();
    const groupsSnap = await db.collection("groups").orderBy("createdAt", "desc").limit(100).get();
    const groups = await Promise.all(groupsSnap.docs.map(async (doc) => {
        const data = doc.data();
        const groupId = data.groupId;
        const membersCount = (await db.collection("groupMembers").where("groupId", "==", groupId).count().get()).data().count;
        const beaconsCount = (await db
            .collection("beacons")
            .where("groupId", "==", groupId)
            .where("active", "==", true)
            .count()
            .get()).data().count;
        let lastAlertAt = null;
        try {
            const lastAlert = await db
                .collection("alerts")
                .where("groupId", "==", groupId)
                .orderBy("createdAt", "desc")
                .limit(1)
                .get();
            lastAlertAt = lastAlert.empty ? null : lastAlert.docs[0].data().createdAt;
        }
        catch {
            // Index may not exist yet, skip
        }
        return {
            groupId,
            name: data.name,
            code: data.code || "",
            planId: data.planId || "free",
            blocked: data.blocked || false,
            createdBy: data.createdBy,
            createdAt: data.createdAt,
            membersCount,
            beaconsCount,
            lastAlertAt,
        };
    }));
    return { groups };
});
exports.adminGetDashboard = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    requireAdmin(request);
    const db = (0, firestore_1.getFirestore)();
    const totalGroups = (await db.collection("groups").count().get()).data().count;
    const totalMembers = (await db.collection("groupMembers").count().get()).data().count;
    const totalBeacons = (await db.collection("beacons").where("active", "==", true).count().get()).data().count;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const alertsToday = (await db.collection("alerts").where("createdAt", ">=", todayStart).count().get()).data().count;
    const alertsWeek = (await db.collection("alerts").where("createdAt", ">=", weekStart).count().get()).data().count;
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
});
exports.adminUpdateGroup = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    requireAdmin(request);
    const { groupId, planId, blocked, blockedReason } = request.data;
    if (!groupId) {
        throw new https_1.HttpsError("invalid-argument", "groupId is required");
    }
    const db = (0, firestore_1.getFirestore)();
    const groupRef = db.collection("groups").doc(groupId);
    const groupDoc = await groupRef.get();
    if (!groupDoc.exists) {
        throw new https_1.HttpsError("not-found", "Group not found");
    }
    const updates = {};
    if (planId !== undefined) {
        const planDoc = await db.collection("plans").doc(planId).get();
        if (!planDoc.exists) {
            throw new https_1.HttpsError("invalid-argument", "Plan not found");
        }
        updates.planId = planId;
    }
    if (blocked !== undefined) {
        updates.blocked = blocked;
        updates.blockedReason = blocked ? (blockedReason || null) : null;
    }
    if (Object.keys(updates).length === 0) {
        throw new https_1.HttpsError("invalid-argument", "No updates provided");
    }
    await groupRef.update(updates);
    return { success: true, groupId, updates };
});
exports.adminDeleteGroup = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    requireAdmin(request);
    const { groupId } = request.data;
    if (!groupId) {
        throw new https_1.HttpsError("invalid-argument", "groupId is required");
    }
    const db = (0, firestore_1.getFirestore)();
    const batch = db.batch();
    const groupRef = db.collection("groups").doc(groupId);
    const groupDoc = await groupRef.get();
    if (!groupDoc.exists) {
        throw new https_1.HttpsError("not-found", "Group not found");
    }
    batch.delete(groupRef);
    const members = await db.collection("groupMembers").where("groupId", "==", groupId).get();
    members.docs.forEach((doc) => batch.delete(doc.ref));
    const beacons = await db.collection("beacons").where("groupId", "==", groupId).get();
    beacons.docs.forEach((doc) => batch.delete(doc.ref));
    const alerts = await db.collection("alerts").where("groupId", "==", groupId).get();
    alerts.docs.forEach((doc) => batch.delete(doc.ref));
    const history = await db.collection("alertHistory").where("groupId", "==", groupId).get();
    history.docs.forEach((doc) => batch.delete(doc.ref));
    const sub = await db.collection("subscriptions").doc(groupId).get();
    if (sub.exists)
        batch.delete(sub.ref);
    await batch.commit();
    return { success: true, groupId };
});
exports.adminBumpVersion = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    requireAdmin(request);
    const db = (0, firestore_1.getFirestore)();
    const version = Date.now().toString();
    await db.collection("config").doc("app").set({ pwaVersion: version }, { merge: true });
    return { version };
});
// HTTP endpoint for deploy scripts (no auth needed, uses deploy secret)
const https_2 = require("firebase-functions/v2/https");
exports.bumpVersion = (0, https_2.onRequest)({ region: "europe-west1" }, async (req, res) => {
    if (req.query.secret !== process.env.DEPLOY_SECRET && req.query.secret !== "deploy-avisamor-2026") {
        res.status(403).send("Forbidden");
        return;
    }
    const db = (0, firestore_1.getFirestore)();
    const version = Date.now().toString();
    await db.collection("config").doc("app").set({ pwaVersion: version }, { merge: true });
    res.send("v" + version);
});
exports.adminCheckSetup = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    requireAdmin(request);
    const db = (0, firestore_1.getFirestore)();
    const plansSnap = await db.collection("plans").limit(1).get();
    return { setupComplete: !plansSnap.empty };
});
exports.adminCreatePlan = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    requireAdmin(request);
    const { planId, name, priceMonthly, order, limits } = request.data;
    if (!planId || typeof planId !== "string") {
        throw new https_1.HttpsError("invalid-argument", "planId is required");
    }
    if (!name || typeof name !== "string") {
        throw new https_1.HttpsError("invalid-argument", "name is required");
    }
    if (priceMonthly === undefined || typeof priceMonthly !== "number") {
        throw new https_1.HttpsError("invalid-argument", "priceMonthly is required (number)");
    }
    if (!limits || typeof limits.maxMembers !== "number" || typeof limits.maxGroups !== "number" || typeof limits.maxBeacons !== "number") {
        throw new https_1.HttpsError("invalid-argument", "limits with maxGroups, maxMembers, maxBeacons required");
    }
    const db = (0, firestore_1.getFirestore)();
    const existing = await db.collection("plans").doc(planId).get();
    if (existing.exists) {
        throw new https_1.HttpsError("already-exists", `Plan "${planId}" already exists`);
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
});
exports.adminUpdatePlan = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    requireAdmin(request);
    const { planId, ...updates } = request.data;
    if (!planId) {
        throw new https_1.HttpsError("invalid-argument", "planId is required");
    }
    const db = (0, firestore_1.getFirestore)();
    const planRef = db.collection("plans").doc(planId);
    const planDoc = await planRef.get();
    if (!planDoc.exists) {
        throw new https_1.HttpsError("not-found", "Plan not found");
    }
    const updateData = {};
    if (updates.name !== undefined)
        updateData.name = updates.name;
    if (updates.priceMonthly !== undefined)
        updateData.priceMonthly = updates.priceMonthly;
    if (updates.order !== undefined)
        updateData.order = updates.order;
    if (updates.active !== undefined)
        updateData.active = updates.active;
    if (updates.limits) {
        const current = planDoc.data()?.limits || {};
        updateData.limits = { ...current, ...updates.limits };
    }
    if (Object.keys(updateData).length === 0) {
        throw new https_1.HttpsError("invalid-argument", "No updates provided");
    }
    await planRef.update(updateData);
    return { success: true, planId };
});
//# sourceMappingURL=admin.js.map