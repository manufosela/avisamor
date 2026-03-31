"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.acceptAlert = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const index_js_1 = require("../models/index.js");
exports.acceptAlert = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required");
    }
    const { alertId, zone } = request.data;
    if (!alertId || typeof alertId !== "string") {
        throw new https_1.HttpsError("invalid-argument", "alertId is required");
    }
    const db = (0, firestore_1.getFirestore)();
    const uid = request.auth.uid;
    const displayName = request.auth.token?.name || uid;
    const result = await db.runTransaction(async (transaction) => {
        const alertRef = db.collection("alerts").doc(alertId);
        const alertSnap = await transaction.get(alertRef);
        if (!alertSnap.exists) {
            throw new https_1.HttpsError("not-found", "Alert not found");
        }
        const alertData = alertSnap.data();
        const status = alertData.status;
        if (status !== index_js_1.AlertStatus.ACTIVE && status !== index_js_1.AlertStatus.ACCEPTED) {
            throw new https_1.HttpsError("failed-precondition", "Alert is not active or accepted");
        }
        // Validate user is responder in the group (outside transaction for read)
        const memberSnapshot = await db
            .collection("groupMembers")
            .where("groupId", "==", alertData.groupId)
            .where("uid", "==", uid)
            .where("role", "==", index_js_1.MemberRole.RESPONDER)
            .limit(1)
            .get();
        if (memberSnapshot.empty) {
            throw new https_1.HttpsError("permission-denied", "User is not a responder in this group");
        }
        const memberData = memberSnapshot.docs[0].data();
        const now = firestore_1.Timestamp.now();
        const isFirst = status === index_js_1.AlertStatus.ACTIVE;
        const acceptEntry = {
            uid,
            displayName: memberData.displayName || displayName,
            acceptedAt: now,
        };
        if (zone && typeof zone === "string") {
            acceptEntry.zone = zone;
        }
        const updateData = {
            acceptedBy: firestore_1.FieldValue.arrayUnion(acceptEntry),
        };
        if (isFirst) {
            updateData.status = index_js_1.AlertStatus.ACCEPTED;
            updateData.firstAcceptedBy = uid;
            updateData.firstAcceptedAt = now;
        }
        transaction.update(alertRef, updateData);
        return { status: "accepted", isFirst };
    });
    return result;
});
//# sourceMappingURL=accept-alert.js.map