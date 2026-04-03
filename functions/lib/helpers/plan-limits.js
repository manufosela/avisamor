"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePlanLimit = validatePlanLimit;
exports.checkGroupNotBlocked = checkGroupNotBlocked;
const https_1 = require("firebase-functions/v2/https");
const index_js_1 = require("../models/index.js");
async function getPlan(db, planId) {
    const planDoc = await db.collection("plans").doc(planId).get();
    if (planDoc.exists) {
        return planDoc.data();
    }
    if (planId !== index_js_1.DEFAULT_PLAN_ID) {
        const defaultDoc = await db.collection("plans").doc(index_js_1.DEFAULT_PLAN_ID).get();
        if (defaultDoc.exists) {
            return defaultDoc.data();
        }
    }
    throw new https_1.HttpsError("failed-precondition", "La plataforma no está configurada. El administrador debe crear los planes desde el panel de admin.");
}
async function getGroupPlanId(db, groupId) {
    const groupDoc = await db.collection("groups").doc(groupId).get();
    if (!groupDoc.exists) {
        throw new https_1.HttpsError("not-found", "Group not found");
    }
    return groupDoc.data()?.planId || index_js_1.DEFAULT_PLAN_ID;
}
async function countResource(db, groupId, resource) {
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
function getLimitForResource(limits, resource) {
    switch (resource) {
        case "members":
            return limits.maxMembers;
        case "beacons":
            return limits.maxBeacons;
        case "groups":
            return limits.maxGroups;
    }
}
const RESOURCE_LABELS = {
    members: "miembros",
    beacons: "beacons",
    groups: "grupos",
};
async function validatePlanLimit(db, groupIdOrOwnerUid, resource, planId) {
    const resolvedPlanId = planId || await getGroupPlanId(db, groupIdOrOwnerUid);
    const plan = await getPlan(db, resolvedPlanId);
    const limit = getLimitForResource(plan.limits, resource);
    if (limit === -1)
        return;
    const current = await countResource(db, groupIdOrOwnerUid, resource);
    if (current >= limit) {
        throw new https_1.HttpsError("resource-exhausted", `Plan ${plan.name}: límite de ${limit} ${RESOURCE_LABELS[resource]} alcanzado. Mejora tu plan para añadir más.`);
    }
}
async function checkGroupNotBlocked(db, groupId) {
    const groupDoc = await db.collection("groups").doc(groupId).get();
    if (!groupDoc.exists) {
        throw new https_1.HttpsError("not-found", "Group not found");
    }
    if (groupDoc.data()?.blocked === true) {
        throw new https_1.HttpsError("permission-denied", `Grupo bloqueado: ${groupDoc.data()?.blockedReason || "contacta con soporte"}`);
    }
}
//# sourceMappingURL=plan-limits.js.map