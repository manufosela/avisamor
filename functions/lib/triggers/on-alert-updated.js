"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onAlertUpdated = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const firestore_2 = require("firebase-admin/firestore");
const messaging_1 = require("firebase-admin/messaging");
const index_js_1 = require("../models/index.js");
exports.onAlertUpdated = (0, firestore_1.onDocumentUpdated)("alerts/{alertId}", async (event) => {
    const change = event.data;
    if (!change)
        return;
    const beforeData = change.before.data();
    const afterData = change.after.data();
    const beforeStatus = beforeData.status;
    const afterStatus = afterData.status;
    if (beforeStatus === afterStatus)
        return;
    const alertId = event.params.alertId;
    const groupId = afterData.groupId;
    const db = (0, firestore_2.getFirestore)();
    // Get all group members (alerter + responders)
    const membersSnap = await db
        .collection("groupMembers")
        .where("groupId", "==", groupId)
        .get();
    const tokens = membersSnap.docs
        .map((doc) => doc.data().fcmToken)
        .filter((t) => t !== null);
    if (tokens.length === 0)
        return;
    let data;
    if (afterStatus === index_js_1.AlertStatus.ACCEPTED) {
        const firstAcceptedBy = afterData.firstAcceptedBy;
        const acceptedBy = afterData.acceptedBy;
        const acceptor = acceptedBy?.find((a) => a.uid === firstAcceptedBy);
        data = {
            alertId,
            type: "alert_accepted",
            acceptedByName: acceptor?.displayName ?? "Unknown",
            acceptedByUid: firstAcceptedBy,
            acceptedByZone: acceptor?.zone ?? "",
        };
    }
    else if (afterStatus === index_js_1.AlertStatus.RESOLVED ||
        afterStatus === index_js_1.AlertStatus.CANCELLED ||
        afterStatus === index_js_1.AlertStatus.EXPIRED) {
        data = {
            alertId,
            type: "alert_dismissed",
            reason: afterStatus,
        };
    }
    else {
        return;
    }
    await (0, messaging_1.getMessaging)().sendEachForMulticast({
        tokens,
        data,
        android: {
            priority: "high",
            ttl: 60000,
        },
    });
});
//# sourceMappingURL=on-alert-updated.js.map