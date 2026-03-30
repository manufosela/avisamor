"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerFcmToken = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
exports.registerFcmToken = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required");
    }
    const { groupId, fcmToken } = request.data;
    if (!groupId || typeof groupId !== "string") {
        throw new https_1.HttpsError("invalid-argument", "Group ID is required");
    }
    if (!fcmToken || typeof fcmToken !== "string") {
        throw new https_1.HttpsError("invalid-argument", "FCM token is required");
    }
    const db = (0, firestore_1.getFirestore)();
    const compositeKey = `${groupId}_${request.auth.uid}`;
    const memberRef = db.collection("groupMembers").doc(compositeKey);
    const memberDoc = await memberRef.get();
    if (!memberDoc.exists) {
        throw new https_1.HttpsError("not-found", "User is not a member of this group");
    }
    await memberRef.update({ fcmToken });
    return { success: true };
});
//# sourceMappingURL=register-fcm-token.js.map