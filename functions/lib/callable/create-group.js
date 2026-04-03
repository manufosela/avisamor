"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGroup = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const index_js_1 = require("../models/index.js");
const plan_limits_js_1 = require("../helpers/plan-limits.js");
const group_code_js_1 = require("../utils/group-code.js");
exports.createGroup = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required");
    }
    const { groupName, role } = request.data;
    if (!groupName || typeof groupName !== "string" || groupName.trim().length < 2) {
        throw new https_1.HttpsError("invalid-argument", "Group name is required (min 2 chars)");
    }
    if (!role || !Object.values(index_js_1.MemberRole).includes(role)) {
        throw new https_1.HttpsError("invalid-argument", "Valid role is required (alerter or responder)");
    }
    const db = (0, firestore_1.getFirestore)();
    await (0, plan_limits_js_1.validatePlanLimit)(db, request.auth.uid, "groups", index_js_1.DEFAULT_PLAN_ID);
    const code = await (0, group_code_js_1.generateUniqueGroupCode)(db);
    const groupRef = db.collection("groups").doc();
    const groupId = groupRef.id;
    const displayName = request.auth.token?.name || request.auth.token?.email || "Usuario";
    const groupData = {
        groupId,
        code,
        name: groupName.trim(),
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
        displayName,
        fcmToken: null,
        joinedAt: firestore_1.FieldValue.serverTimestamp(),
    };
    await db.collection("groupMembers").doc(compositeKey).set(memberData);
    return { groupId, code, groupName: groupName.trim() };
});
//# sourceMappingURL=create-group.js.map