import { onRequest } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { compare } from "bcryptjs";
import { logger } from "firebase-functions/v2";
import { AlertStatus, TriggerSource } from "../models/index.js";

const DEBOUNCE_SECONDS = 30;
const ALERT_EXPIRY_MS = 60_000;

export const triggerAlert = onRequest(
  { region: "europe-west1" },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const apiKey = req.headers["x-api-key"] as string | undefined;
    if (!apiKey) {
      res.status(401).json({ error: "Missing x-api-key header" });
      return;
    }

    const db = getFirestore();

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
    let groupId: string | null = null;
    let matchedKeyId: string | null = null;
    for (const doc of keysSnapshot.docs) {
      const data = doc.data();
      const match = await compare(apiKey, data.keyHash);
      if (match) {
        // Check key expiration (OWASP A07)
        const expiresAt = data.expiresAt as Timestamp | null | undefined;
        if (expiresAt && expiresAt.toMillis() < Date.now()) {
          logger.warn("API key expired", { keyId: doc.id, groupId: data.groupId });
          res.status(401).json({ error: "API key expired" });
          return;
        }
        groupId = data.groupId;
        matchedKeyId = doc.id;
        break;
      }
    }

    if (!groupId || !matchedKeyId) {
      logger.warn("API key authentication failed", {
        ip: req.ip,
        reason: "invalid_key",
      });
      res.status(401).json({ error: "Invalid API key" });
      return;
    }

    // Audit: update lastUsedAt (OWASP A09)
    db.collection("apiKeys").doc(matchedKeyId).update({
      lastUsedAt: FieldValue.serverTimestamp(),
    }).catch((err) => logger.error("Failed to update lastUsedAt", { keyId: matchedKeyId, error: err }));

    // Transaction: debounce check + create alert
    try {
      const alertId = await db.runTransaction(async (transaction) => {
        const debounceThreshold = Timestamp.fromMillis(Date.now() - DEBOUNCE_SECONDS * 1000);

        const recentQuery = db
          .collection("alerts")
          .where("groupId", "==", groupId)
          .where("status", "==", AlertStatus.ACTIVE)
          .where("createdAt", ">", debounceThreshold);

        const recentAlerts = await transaction.get(recentQuery);

        if (!recentAlerts.empty) {
          return null; // debounce hit
        }

        const alerterSnap = await db.collection("groupMembers")
          .where("groupId", "==", groupId)
          .where("role", "==", "alerter")
          .limit(1)
          .get();
        const alerterName = alerterSnap.empty ? "Botón Flic" : alerterSnap.docs[0].data().displayName || "Botón Flic";

        const alertRef = db.collection("alerts").doc();
        transaction.set(alertRef, {
          alertId: alertRef.id,
          groupId,
          triggeredBy: "flic-button",
          alerterName,
          triggerSource: TriggerSource.FLIC,
          status: AlertStatus.ACTIVE,
          createdAt: FieldValue.serverTimestamp(),
          expiresAt: Timestamp.fromMillis(Date.now() + ALERT_EXPIRY_MS),
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

      logger.info("Alert triggered via API key", { keyId: matchedKeyId, groupId, alertId });
      res.status(200).json({ alertId });
    } catch (error) {
      logger.error("Error creating alert via API", { keyId: matchedKeyId, groupId, error });
      res.status(500).json({ error: "Internal server error" });
    }
  },
);
