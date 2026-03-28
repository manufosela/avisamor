import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { AlertStatus } from "../models/index.js";

export const expireAlerts = onSchedule(
  {
    schedule: "every 1 minutes",
    region: "europe-west1",
  },
  async () => {
    const db = getFirestore();
    const now = Timestamp.now();

    const expiredSnap = await db
      .collection("alerts")
      .where("status", "==", AlertStatus.ACTIVE)
      .where("expiresAt", "<=", now)
      .get();

    if (expiredSnap.empty) return;

    const updates = expiredSnap.docs.map(async (doc) => {
      const alertData = doc.data();

      // Update alert status to expired
      await doc.ref.update({ status: AlertStatus.EXPIRED });

      // Archive to alertHistory
      await db.collection("alertHistory").doc(doc.id).set({
        ...alertData,
        status: AlertStatus.EXPIRED,
        archivedAt: FieldValue.serverTimestamp(),
      });
    });

    await Promise.all(updates);
  },
);
