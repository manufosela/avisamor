"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expireAlerts = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-admin/firestore");
const index_js_1 = require("../models/index.js");
exports.expireAlerts = (0, scheduler_1.onSchedule)({
    schedule: "every 1 minutes",
    region: "europe-west1",
}, async () => {
    const db = (0, firestore_1.getFirestore)();
    const now = firestore_1.Timestamp.now();
    const expiredSnap = await db
        .collection("alerts")
        .where("status", "==", index_js_1.AlertStatus.ACTIVE)
        .where("expiresAt", "<=", now)
        .get();
    if (expiredSnap.empty)
        return;
    const updates = expiredSnap.docs.map(async (doc) => {
        const alertData = doc.data();
        // Update alert status to expired
        await doc.ref.update({ status: index_js_1.AlertStatus.EXPIRED });
        // Archive to alertHistory
        await db.collection("alertHistory").doc(doc.id).set({
            ...alertData,
            status: index_js_1.AlertStatus.EXPIRED,
            archivedAt: firestore_1.FieldValue.serverTimestamp(),
        });
    });
    await Promise.all(updates);
});
//# sourceMappingURL=expire-alerts.js.map