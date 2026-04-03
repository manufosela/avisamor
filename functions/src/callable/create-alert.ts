import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { AlertStatus, TriggerSource, MemberRole } from "../models/index.js";
import { validateGroupId } from "../utils/validation.js";

const DEBOUNCE_SECONDS = 30;
const ALERT_EXPIRY_MS = 60_000;

export const createAlert = onCall(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const { groupId, source } = request.data as { groupId?: string; source?: string };

    validateGroupId(groupId);

    const db = getFirestore();
    const uid = request.auth.uid;

    // Validate user is alerter in the group
    const memberSnapshot = await db
      .collection("groupMembers")
      .where("groupId", "==", groupId)
      .where("uid", "==", uid)
      .where("role", "==", MemberRole.ALERTER)
      .limit(1)
      .get();

    if (memberSnapshot.empty) {
      throw new HttpsError("permission-denied", "User is not an alerter in this group");
    }

    // Transaction: debounce check + create alert
    const alertId = await db.runTransaction(async (transaction) => {
      const debounceThreshold = Timestamp.fromMillis(Date.now() - DEBOUNCE_SECONDS * 1000);

      const recentQuery = db
        .collection("alerts")
        .where("groupId", "==", groupId)
        .where("status", "==", AlertStatus.ACTIVE)
        .where("createdAt", ">", debounceThreshold);

      const recentAlerts = await transaction.get(recentQuery);

      if (!recentAlerts.empty) {
        throw new HttpsError("resource-exhausted", "Alert already active, please wait");
      }

      const memberSnap = await db.collection("groupMembers").doc(`${groupId}_${uid}`).get();
      const alerterName = memberSnap.exists ? memberSnap.data()?.displayName || "Alguien" : "Alguien";

      const alertRef = db.collection("alerts").doc();
      transaction.set(alertRef, {
        alertId: alertRef.id,
        groupId,
        triggeredBy: uid,
        alerterName,
        triggerSource: source === "android" ? TriggerSource.ANDROID : TriggerSource.PWA,
        status: AlertStatus.ACTIVE,
        createdAt: FieldValue.serverTimestamp(),
        expiresAt: Timestamp.fromMillis(Date.now() + ALERT_EXPIRY_MS),
        acceptedBy: [],
        firstAcceptedBy: null,
        firstAcceptedAt: null,
      });

      return alertRef.id;
    });

    return { alertId };
  },
);
