"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onAlertCreated = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const firestore_2 = require("firebase-admin/firestore");
const messaging_1 = require("firebase-admin/messaging");
const index_js_1 = require("../models/index.js");
const INVALID_TOKEN_CODES = [
    "messaging/registration-token-not-registered",
    "messaging/invalid-registration-token",
];
exports.onAlertCreated = (0, firestore_1.onDocumentCreated)("alerts/{alertId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot)
        return;
    const alertData = snapshot.data();
    if (alertData.status !== index_js_1.AlertStatus.ACTIVE)
        return;
    const { groupId, triggeredBy } = alertData;
    const alertId = event.params.alertId;
    const db = (0, firestore_2.getFirestore)();
    // Get all responders in the group
    const respondersSnap = await db
        .collection("groupMembers")
        .where("groupId", "==", groupId)
        .where("role", "==", index_js_1.MemberRole.RESPONDER)
        .get();
    // Collect tokens and member doc IDs for cleanup
    const tokenEntries = [];
    for (const doc of respondersSnap.docs) {
        const member = doc.data();
        if (member.fcmToken) {
            tokenEntries.push({ docId: doc.id, token: member.fcmToken });
        }
    }
    // Get alerter display name
    const alerterSnap = await db
        .collection("groupMembers")
        .where("groupId", "==", groupId)
        .where("uid", "==", triggeredBy)
        .get();
    const alerterName = alerterSnap.empty
        ? "Unknown"
        : alerterSnap.docs[0].data().displayName;
    if (tokenEntries.length === 0)
        return;
    const tokens = tokenEntries.map((e) => e.token);
    const result = await (0, messaging_1.getMessaging)().sendEachForMulticast({
        tokens,
        data: {
            alertId,
            groupId,
            alerterName,
            type: "new_alert",
        },
        android: {
            priority: "high",
            ttl: 60000,
        },
    });
    // Clean up invalid tokens
    if (result.failureCount > 0) {
        const cleanupPromises = [];
        result.responses.forEach((resp, idx) => {
            if (!resp.success && resp.error && INVALID_TOKEN_CODES.includes(resp.error.code)) {
                cleanupPromises.push(db.collection("groupMembers").doc(tokenEntries[idx].docId).update({ fcmToken: null }));
            }
        });
        await Promise.all(cleanupPromises);
    }
});
//# sourceMappingURL=on-alert-created.js.map