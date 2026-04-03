"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHistory = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const validation_js_1 = require("../utils/validation.js");
exports.getHistory = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required");
    }
    const { groupId, limit: requestedLimit, startAfter } = request.data;
    (0, validation_js_1.validateGroupId)(groupId);
    const db = (0, firestore_1.getFirestore)();
    const uid = request.auth.uid;
    // Validate user is member of group
    const memberDoc = await db
        .collection("groupMembers")
        .doc(`${groupId}_${uid}`)
        .get();
    if (!memberDoc.exists) {
        throw new https_1.HttpsError("permission-denied", "Not a member of this group");
    }
    const pageSize = Math.min(requestedLimit ?? 50, 100);
    let query = db
        .collection("alertHistory")
        .where("groupId", "==", groupId)
        .orderBy("createdAt", "desc");
    if (startAfter && typeof startAfter === "string") {
        const cursorDoc = await db.collection("alertHistory").doc(startAfter).get();
        if (cursorDoc.exists) {
            query = query.startAfter(cursorDoc);
        }
    }
    // Fetch one extra to determine hasMore
    const snap = await query.limit(pageSize + 1).get();
    const hasMore = snap.docs.length > pageSize;
    const alerts = snap.docs
        .slice(0, pageSize)
        .map((doc) => doc.data());
    return { alerts, hasMore };
});
//# sourceMappingURL=get-history.js.map