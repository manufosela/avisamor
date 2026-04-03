"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.joinGroup = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const index_js_1 = require("../models/index.js");
const plan_limits_js_1 = require("../helpers/plan-limits.js");
exports.joinGroup = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required");
    }
    const { code, role } = request.data;
    if (!code || typeof code !== "string" || code.trim().length < 3) {
        throw new https_1.HttpsError("invalid-argument", "Group code is required");
    }
    if (!role || !Object.values(index_js_1.MemberRole).includes(role)) {
        throw new https_1.HttpsError("invalid-argument", "Valid role is required (alerter or responder)");
    }
    const db = (0, firestore_1.getFirestore)();
    const normalizedCode = code.trim().toLowerCase();
    const groupSnapshot = await db
        .collection("groups")
        .where("code", "==", normalizedCode)
        .limit(1)
        .get();
    if (groupSnapshot.empty) {
        throw new https_1.HttpsError("not-found", "No se encontró un grupo con ese código");
    }
    const groupDoc = groupSnapshot.docs[0];
    const groupData = groupDoc.data();
    const groupId = groupData.groupId;
    const groupName = groupData.name;
    await (0, plan_limits_js_1.checkGroupNotBlocked)(db, groupId);
    await (0, plan_limits_js_1.validatePlanLimit)(db, groupId, "members");
    const compositeKey = `${groupId}_${request.auth.uid}`;
    const memberRef = db.collection("groupMembers").doc(compositeKey);
    const memberDoc = await memberRef.get();
    if (memberDoc.exists) {
        throw new https_1.HttpsError("already-exists", "Ya eres miembro de este grupo");
    }
    const displayName = request.auth.token?.name || request.auth.token?.email || "Usuario";
    const memberData = {
        memberId: compositeKey,
        uid: request.auth.uid,
        groupId,
        role: role,
        displayName,
        fcmToken: null,
        joinedAt: firestore_1.FieldValue.serverTimestamp(),
    };
    await memberRef.set(memberData);
    return { groupId, groupName };
});
//# sourceMappingURL=join-group.js.map