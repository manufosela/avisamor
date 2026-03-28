import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { AlertStatus, MemberRole, isValidTransition } from "../models/index.js";

export const resolveAlert = onCall(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const { alertId } = request.data as { alertId?: string };

    if (!alertId || typeof alertId !== "string") {
      throw new HttpsError("invalid-argument", "alertId is required");
    }

    const db = getFirestore();
    const uid = request.auth.uid;

    const result = await db.runTransaction(async (transaction) => {
      const alertRef = db.collection("alerts").doc(alertId);
      const alertSnap = await transaction.get(alertRef);

      if (!alertSnap.exists) {
        throw new HttpsError("not-found", "Alert not found");
      }

      const alertData = alertSnap.data()!;
      const currentStatus = alertData.status as AlertStatus;

      if (!isValidTransition(currentStatus, AlertStatus.RESOLVED)) {
        throw new HttpsError(
          "failed-precondition",
          `Cannot resolve alert with status '${currentStatus}'`,
        );
      }

      transaction.update(alertRef, {
        status: AlertStatus.RESOLVED,
        resolvedAt: FieldValue.serverTimestamp(),
        resolvedBy: uid,
      });

      // Archive to alertHistory
      const historyRef = db.collection("alertHistory").doc(alertId);
      transaction.set(historyRef, {
        ...alertData,
        status: AlertStatus.RESOLVED,
        resolvedAt: FieldValue.serverTimestamp(),
        resolvedBy: uid,
        archivedAt: FieldValue.serverTimestamp(),
      });

      return { status: "resolved" as const };
    });

    return result;
  },
);

export const cancelAlert = onCall(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const { alertId } = request.data as { alertId?: string };

    if (!alertId || typeof alertId !== "string") {
      throw new HttpsError("invalid-argument", "alertId is required");
    }

    const db = getFirestore();
    const uid = request.auth.uid;

    const result = await db.runTransaction(async (transaction) => {
      const alertRef = db.collection("alerts").doc(alertId);
      const alertSnap = await transaction.get(alertRef);

      if (!alertSnap.exists) {
        throw new HttpsError("not-found", "Alert not found");
      }

      const alertData = alertSnap.data()!;
      const currentStatus = alertData.status as AlertStatus;

      if (!isValidTransition(currentStatus, AlertStatus.CANCELLED)) {
        throw new HttpsError(
          "failed-precondition",
          `Cannot cancel alert with status '${currentStatus}'`,
        );
      }

      // Only an alerter of the group can cancel (handles both Flic and direct alerts)
      const memberDoc = await transaction.get(
        db.collection("groupMembers").doc(`${alertData.groupId}_${uid}`)
      );
      if (!memberDoc.exists || memberDoc.data()?.role !== MemberRole.ALERTER) {
        throw new HttpsError("permission-denied", "Only an alerter can cancel the alert");
      }

      transaction.update(alertRef, {
        status: AlertStatus.CANCELLED,
        cancelledAt: FieldValue.serverTimestamp(),
      });

      // Archive to alertHistory
      const historyRef = db.collection("alertHistory").doc(alertId);
      transaction.set(historyRef, {
        ...alertData,
        status: AlertStatus.CANCELLED,
        cancelledAt: FieldValue.serverTimestamp(),
        archivedAt: FieldValue.serverTimestamp(),
      });

      return { status: "cancelled" as const };
    });

    return result;
  },
);
