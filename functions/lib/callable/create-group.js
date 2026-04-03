"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGroup = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const index_js_1 = require("../models/index.js");
const validation_js_1 = require("../utils/validation.js");
const plan_limits_js_1 = require("../helpers/plan-limits.js");
function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
async function generateUniqueCode(db) {
    const maxAttempts = 10;
    for (let i = 0; i < maxAttempts; i++) {
        const code = generateCode();
        const snapshot = await db
            .collection("groups")
            .where("code", "==", code)
            .limit(1)
            .get();
        if (snapshot.empty) {
            return code;
        }
    }
    throw new https_1.HttpsError("internal", "Unable to generate unique code");
}
exports.createGroup = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required");
    }
    const { name, role } = request.data;
    (0, validation_js_1.validateDisplayName)(name);
    if (!role || !Object.values(index_js_1.MemberRole).includes(role)) {
        throw new https_1.HttpsError("invalid-argument", "Valid role is required (alerter or responder)");
    }
    const db = (0, firestore_1.getFirestore)();
    // Check plan limit for groups (pass ownerUid as groupId for count)
    await (0, plan_limits_js_1.validatePlanLimit)(db, request.auth.uid, "groups", index_js_1.DEFAULT_PLAN_ID);
    const code = await generateUniqueCode(db);
    const groupRef = db.collection("groups").doc();
    const groupId = groupRef.id;
    const groupData = {
        groupId,
        code,
        name,
        createdBy: request.auth.uid,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        alertExpirySeconds: 60,
        escalateTo112: false,
        escalateAfterSeconds: 0,
        planId: index_js_1.DEFAULT_PLAN_ID,
        blocked: false,
    };
    await groupRef.set(groupData);
    const compositeKey = `${groupId}_${request.auth.uid}`;
    const memberData = {
        memberId: compositeKey,
        uid: request.auth.uid,
        groupId,
        role: role,
        displayName: name,
        fcmToken: null,
        joinedAt: firestore_1.FieldValue.serverTimestamp(),
    };
    await db.collection("groupMembers").doc(compositeKey).set(memberData);
    return { groupId, code };
});
//# sourceMappingURL=create-group.js.map