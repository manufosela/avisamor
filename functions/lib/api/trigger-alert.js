"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerAlert = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const bcryptjs_1 = require("bcryptjs");
const index_js_1 = require("../models/index.js");
const DEBOUNCE_SECONDS = 30;
const ALERT_EXPIRY_MS = 60_000;
exports.triggerAlert = (0, https_1.onRequest)({ region: "europe-west1" }, async (req, res) => {
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    const apiKey = req.headers["x-api-key"];
    if (!apiKey) {
        res.status(401).json({ error: "Missing x-api-key header" });
        return;
    }
    const db = (0, firestore_1.getFirestore)();
    // Look up active API keys
    const keysSnapshot = await db
        .collection("apiKeys")
        .where("active", "==", true)
        .get();
    if (keysSnapshot.empty) {
        res.status(401).json({ error: "Invalid API key" });
        return;
    }
    // Find matching key by comparing bcrypt hash
    let groupId = null;
    for (const doc of keysSnapshot.docs) {
        const data = doc.data();
        const match = await (0, bcryptjs_1.compare)(apiKey, data.keyHash);
        if (match) {
            groupId = data.groupId;
            break;
        }
    }
    if (!groupId) {
        res.status(401).json({ error: "Invalid API key" });
        return;
    }
    // Transaction: debounce check + create alert
    try {
        const alertId = await db.runTransaction(async (transaction) => {
            const debounceThreshold = firestore_1.Timestamp.fromMillis(Date.now() - DEBOUNCE_SECONDS * 1000);
            const recentQuery = db
                .collection("alerts")
                .where("groupId", "==", groupId)
                .where("status", "==", index_js_1.AlertStatus.ACTIVE)
                .where("createdAt", ">", debounceThreshold);
            const recentAlerts = await transaction.get(recentQuery);
            if (!recentAlerts.empty) {
                return null; // debounce hit
            }
            const alertRef = db.collection("alerts").doc();
            transaction.set(alertRef, {
                alertId: alertRef.id,
                groupId,
                triggeredBy: "flic-button",
                triggerSource: index_js_1.TriggerSource.FLIC,
                status: index_js_1.AlertStatus.ACTIVE,
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                expiresAt: firestore_1.Timestamp.fromMillis(Date.now() + ALERT_EXPIRY_MS),
                acceptedBy: [],
                firstAcceptedBy: null,
                firstAcceptedAt: null,
            });
            return alertRef.id;
        });
        if (!alertId) {
            res.status(429).json({ error: "Alert already active, please wait" });
            return;
        }
        res.status(200).json({ alertId });
    }
    catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});
//# sourceMappingURL=trigger-alert.js.map