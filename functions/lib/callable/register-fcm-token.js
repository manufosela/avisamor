"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerFcmToken = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const validation_js_1 = require("../utils/validation.js");
exports.registerFcmToken = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required");
    }
    const { groupId, fcmToken } = request.data;
    (0, validation_js_1.validateGroupId)(groupId);
    (0, validation_js_1.validateFcmToken)(fcmToken);
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