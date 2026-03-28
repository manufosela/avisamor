import { onRequest } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { compare } from "bcryptjs";
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
    for (const doc of keysSnapshot.docs) {
      const data = doc.data();
      const match = await compare(apiKey, data.keyHash);
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

        const alertRef = db.collection("alerts").doc();
        transaction.set(alertRef, {
          alertId: alertRef.id,
          groupId,
          triggeredBy: "flic-button",
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

      res.status(200).json({ alertId });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  },
);
