"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelAlert = exports.resolveAlert = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const index_js_1 = require("../models/index.js");
const validation_js_1 = require("../utils/validation.js");
exports.resolveAlert = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required");
    }
    const { alertId } = request.data;
    (0, validation_js_1.validateAlertId)(alertId);
    const db = (0, firestore_1.getFirestore)();
    const uid = request.auth.uid;
    const result = await db.runTransaction(async (transaction) => {
        const alertRef = db.collection("alerts").doc(alertId);
        const alertSnap = await transaction.get(alertRef);
        if (!alertSnap.exists) {
            throw new https_1.HttpsError("not-found", "Alert not found");
        }
        const alertData = alertSnap.data();
        const currentStatus = alertData.status;
        if (!(0, index_js_1.isValidTransition)(currentStatus, index_js_1.AlertStatus.RESOLVED)) {
            throw new https_1.HttpsError("failed-precondition", `Cannot resolve alert with status '${currentStatus}'`);
        }
        transaction.update(alertRef, {
            status: index_js_1.AlertStatus.RESOLVED,
            resolvedAt: firestore_1.FieldValue.serverTimestamp(),
            resolvedBy: uid,
        });
        // Archive to alertHistory
        const historyRef = db.collection("alertHistory").doc(alertId);
        transaction.set(historyRef, {
            ...alertData,
            status: index_js_1.AlertStatus.RESOLVED,
            resolvedAt: firestore_1.FieldValue.serverTimestamp(),
            resolvedBy: uid,
            archivedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        return { status: "resolved" };
    });
    return result;
});
exports.cancelAlert = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required");
    }
    const { alertId } = request.data;
    (0, validation_js_1.validateAlertId)(alertId);
    const db = (0, firestore_1.getFirestore)();
    const uid = request.auth.uid;
    const result = await db.runTransaction(async (transaction) => {
        const alertRef = db.collection("alerts").doc(alertId);
        const alertSnap = await transaction.get(alertRef);
        if (!alertSnap.exists) {
            throw new https_1.HttpsError("not-found", "Alert not found");
        }
        const alertData = alertSnap.data();
        const currentStatus = alertData.status;
        if (!(0, index_js_1.isValidTransition)(currentStatus, index_js_1.AlertStatus.CANCELLED)) {
            throw new https_1.HttpsError("failed-precondition", `Cannot cancel alert with status '${currentStatus}'`);
        }
        // Only an alerter of the group can cancel (handles both Flic and direct alerts)
        const memberDoc = await transaction.get(db.collection("groupMembers").doc(`${alertData.groupId}_${uid}`));
        if (!memberDoc.exists || memberDoc.data()?.role !== index_js_1.MemberRole.ALERTER) {
            throw new https_1.HttpsError("permission-denied", "Only an alerter can cancel the alert");
        }
        transaction.update(alertRef, {
            status: index_js_1.AlertStatus.CANCELLED,
            cancelledAt: firestore_1.FieldValue.serverTimestamp(),
        });
        // Archive to alertHistory
        const historyRef = db.collection("alertHistory").doc(alertId);
        transaction.set(historyRef, {
            ...alertData,
            status: index_js_1.AlertStatus.CANCELLED,
            cancelledAt: firestore_1.FieldValue.serverTimestamp(),
            archivedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        return { status: "cancelled" };
    });
    return result;
});
//# sourceMappingURL=resolve-cancel-alert.js.map