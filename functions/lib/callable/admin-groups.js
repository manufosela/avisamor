"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminDeleteBeacon = exports.adminDeleteMember = exports.adminUpdateMember = exports.adminCreateGroupFromAdmin = exports.adminGetGroup = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const index_js_1 = require("../models/index.js");
const group_code_js_1 = require("../utils/group-code.js");
function requireAdmin(request) {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Authentication required");
    if (request.auth.token?.admin !== true)
        throw new https_1.HttpsError("permission-denied", "Admin access required");
}
exports.adminGetGroup = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    requireAdmin(request);
    const { groupId } = request.data;
    if (!groupId)
        throw new https_1.HttpsError("invalid-argument", "groupId required");
    const db = (0, firestore_1.getFirestore)();
    const groupDoc = await db.collection("groups").doc(groupId).get();
    if (!groupDoc.exists)
        throw new https_1.HttpsError("not-found", "Group not found");
    const group = groupDoc.data();
    const members = (await db.collection("groupMembers").where("groupId", "==", groupId).get())
        .docs.map(d => ({ id: d.id, ...d.data() }));
    const beacons = (await db.collection("beacons").where("groupId", "==", groupId).where("active", "==", true).get())
        .docs.map(d => ({ id: d.id, ...d.data() }));
    let alerts = [];
    try {
        const alertDocs = await db.collection("alerts")
            .where("groupId", "==", groupId)
            .orderBy("createdAt", "desc")
            .limit(20)
            .get();
        alerts = alertDocs.docs.map(d => ({ id: d.id, ...d.data() }));
    }
    catch { /* index may not exist */ }
    if (alerts.length === 0) {
        try {
            const historyDocs = await db.collection("alertHistory")
                .where("groupId", "==", groupId)
                .orderBy("createdAt", "desc")
                .limit(20)
                .get();
            alerts = historyDocs.docs.map(d => ({ id: d.id, ...d.data() }));
        }
        catch { /* index may not exist */ }
    }
    return {
        group: { groupId, ...group },
        members,
        beacons,
        alerts,
    };
});
exports.adminCreateGroupFromAdmin = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    requireAdmin(request);
    const { groupName, planId } = request.data;
    if (!groupName || groupName.trim().length < 2)
        throw new https_1.HttpsError("invalid-argument", "Group name required");
    const db = (0, firestore_1.getFirestore)();
    const code = await (0, group_code_js_1.generateUniqueGroupCode)(db);
    const groupRef = db.collection("groups").doc();
    await groupRef.set({
        groupId: groupRef.id,
        code,
        name: groupName.trim(),
        createdBy: request.auth.uid,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        alertExpirySeconds: 60,
        escalateTo112: false,
        escalateAfterSeconds: 0,
        planId: planId || index_js_1.DEFAULT_PLAN_ID,
        blocked: false,
    });
    return { groupId: groupRef.id, code };
});
exports.adminUpdateMember = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    requireAdmin(request);
    const { memberId, role } = request.data;
    if (!memberId)
        throw new https_1.HttpsError("invalid-argument", "memberId required");
    if (!role || !Object.values(index_js_1.MemberRole).includes(role)) {
        throw new https_1.HttpsError("invalid-argument", "Valid role required");
    }
    const db = (0, firestore_1.getFirestore)();
    const ref = db.collection("groupMembers").doc(memberId);
    const doc = await ref.get();
    if (!doc.exists)
        throw new https_1.HttpsError("not-found", "Member not found");
    await ref.update({ role });
    return { success: true };
});
exports.adminDeleteMember = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    requireAdmin(request);
    const { memberId } = request.data;
    if (!memberId)
        throw new https_1.HttpsError("invalid-argument", "memberId required");
    const db = (0, firestore_1.getFirestore)();
    await db.collection("groupMembers").doc(memberId).delete();
    return { success: true };
});
exports.adminDeleteBeacon = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    requireAdmin(request);
    const { beaconId } = request.data;
    if (!beaconId)
        throw new https_1.HttpsError("invalid-argument", "beaconId required");
    const db = (0, firestore_1.getFirestore)();
    await db.collection("beacons").doc(beaconId).update({ active: false });
    return { success: true };
});
//# sourceMappingURL=admin-groups.js.map