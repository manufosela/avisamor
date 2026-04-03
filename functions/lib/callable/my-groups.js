"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.myGroups = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
exports.myGroups = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required");
    }
    const db = (0, firestore_1.getFirestore)();
    const uid = request.auth.uid;
    const memberships = await db
        .collection("groupMembers")
        .where("uid", "==", uid)
        .get();
    if (memberships.empty) {
        return { groups: [] };
    }
    const groups = await Promise.all(memberships.docs.map(async (memberDoc) => {
        const memberData = memberDoc.data();
        const groupDoc = await db.collection("groups").doc(memberData.groupId).get();
        if (!groupDoc.exists)
            return null;
        const groupData = groupDoc.data();
        return {
            groupId: memberData.groupId,
            groupName: groupData.name,
            code: groupData.code,
            role: memberData.role,
            blocked: groupData.blocked || false,
        };
    }));
    return { groups: groups.filter(Boolean) };
});
//# sourceMappingURL=my-groups.js.map