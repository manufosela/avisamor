"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.joinGroup = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const index_js_1 = require("../models/index.js");
const validation_js_1 = require("../utils/validation.js");
const plan_limits_js_1 = require("../helpers/plan-limits.js");
exports.joinGroup = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required");
    }
    const { code, displayName, role } = request.data;
    (0, validation_js_1.validateGroupCode)(code);
    (0, validation_js_1.validateDisplayName)(displayName);
    if (!role || !Object.values(index_js_1.MemberRole).includes(role)) {
        throw new https_1.HttpsError("invalid-argument", "Valid role is required (alerter or responder)");
    }
    const db = (0, firestore_1.getFirestore)();
    const groupSnapshot = await db
        .collection("groups")
        .where("code", "==", code)
        .limit(1)
        .get();
    if (groupSnapshot.empty) {
        throw new https_1.HttpsError("not-found", "Group not found with the provided code");
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
        throw new https_1.HttpsError("already-exists", "User is already a member of this group");
    }
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