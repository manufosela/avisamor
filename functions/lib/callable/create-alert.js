"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAlert = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const index_js_1 = require("../models/index.js");
const DEBOUNCE_SECONDS = 30;
const ALERT_EXPIRY_MS = 60_000;
exports.createAlert = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required");
    }
    const { groupId, source } = request.data;
    if (!groupId || typeof groupId !== "string") {
        throw new https_1.HttpsError("invalid-argument", "groupId is required");
    }
    const db = (0, firestore_1.getFirestore)();
    const uid = request.auth.uid;
    // Validate user is alerter in the group
    const memberSnapshot = await db
        .collection("groupMembers")
        .where("groupId", "==", groupId)
        .where("uid", "==", uid)
        .where("role", "==", index_js_1.MemberRole.ALERTER)
        .limit(1)
        .get();
    if (memberSnapshot.empty) {
        throw new https_1.HttpsError("permission-denied", "User is not an alerter in this group");
    }
    // Transaction: debounce check + create alert
    const alertId = await db.runTransaction(async (transaction) => {
        const debounceThreshold = firestore_1.Timestamp.fromMillis(Date.now() - DEBOUNCE_SECONDS * 1000);
        const recentQuery = db
            .collection("alerts")
            .where("groupId", "==", groupId)
            .where("status", "==", index_js_1.AlertStatus.ACTIVE)
            .where("createdAt", ">", debounceThreshold);
        const recentAlerts = await transaction.get(recentQuery);
        if (!recentAlerts.empty) {
            throw new https_1.HttpsError("resource-exhausted", "Alert already active, please wait");
        }
        const alertRef = db.collection("alerts").doc();
        transaction.set(alertRef, {
            alertId: alertRef.id,
            groupId,
            triggeredBy: uid,
            triggerSource: source === "android" ? index_js_1.TriggerSource.ANDROID : index_js_1.TriggerSource.PWA,
            status: index_js_1.AlertStatus.ACTIVE,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            expiresAt: firestore_1.Timestamp.fromMillis(Date.now() + ALERT_EXPIRY_MS),
            acceptedBy: [],
            firstAcceptedBy: null,
            firstAcceptedAt: null,
        });
        return alertRef.id;
    });
    return { alertId };
});
//# sourceMappingURL=create-alert.js.map