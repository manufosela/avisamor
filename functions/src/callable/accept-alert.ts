import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { AlertStatus, MemberRole } from "../models/index.js";
import { validateAlertId, validateZoneName } from "../utils/validation.js";

export const acceptAlert = onCall(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const { alertId, zone } = request.data as { alertId?: string; zone?: string };

    validateAlertId(alertId);
    if (zone !== undefined && zone !== null) {
      validateZoneName(zone);
    }

    const db = getFirestore();
    const uid = request.auth.uid;
    const displayName = request.auth.token?.name || uid;

    const result = await db.runTransaction(async (transaction) => {
      const alertRef = db.collection("alerts").doc(alertId);
      const alertSnap = await transaction.get(alertRef);

      if (!alertSnap.exists) {
        throw new HttpsError("not-found", "Alert not found");
      }

      const alertData = alertSnap.data()!;
      const status = alertData.status as AlertStatus;

      if (status !== AlertStatus.ACTIVE && status !== AlertStatus.ACCEPTED) {
        throw new HttpsError("failed-precondition", "Alert is not active or accepted");
      }

      // Validate user is responder in the group (outside transaction for read)
      const memberSnapshot = await db
        .collection("groupMembers")
        .where("groupId", "==", alertData.groupId)
        .where("uid", "==", uid)
        .where("role", "==", MemberRole.RESPONDER)
        .limit(1)
        .get();

      if (memberSnapshot.empty) {
        throw new HttpsError("permission-denied", "User is not a responder in this group");
      }

      const memberData = memberSnapshot.docs[0].data();
      const now = Timestamp.now();
      const isFirst = status === AlertStatus.ACTIVE;

      const acceptEntry: Record<string, unknown> = {
        uid,
        displayName: memberData.displayName || displayName,
        acceptedAt: now,
      };
      if (zone && typeof zone === "string") {
        acceptEntry.zone = zone;
      }

      const updateData: Record<string, unknown> = {
        acceptedBy: FieldValue.arrayUnion(acceptEntry),
      };

      if (isFirst) {
        updateData.status = AlertStatus.ACCEPTED;
        updateData.firstAcceptedBy = uid;
        updateData.firstAcceptedAt = now;
      }

      transaction.update(alertRef, updateData);

      return { status: "accepted" as const, isFirst };
    });

    return result;
  },
);
