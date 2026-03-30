import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { AlertStatus } from "../models/index.js";

export const onAlertUpdated = onDocumentUpdated(
  "alerts/{alertId}",
  async (event) => {
    const change = event.data;
    if (!change) return;

    const beforeData = change.before.data();
    const afterData = change.after.data();

    const beforeStatus = beforeData.status as AlertStatus;
    const afterStatus = afterData.status as AlertStatus;

    if (beforeStatus === afterStatus) return;

    const alertId = event.params.alertId;
    const groupId = afterData.groupId as string;
    const db = getFirestore();

    // Get all group members (alerter + responders)
    const membersSnap = await db
      .collection("groupMembers")
      .where("groupId", "==", groupId)
      .get();

    const tokens = membersSnap.docs
      .map((doc) => doc.data().fcmToken as string | null)
      .filter((t): t is string => t !== null);

    if (tokens.length === 0) return;

    let data: Record<string, string>;

    if (afterStatus === AlertStatus.ACCEPTED) {
      const firstAcceptedBy = afterData.firstAcceptedBy as string;
      const acceptedBy = afterData.acceptedBy as Array<{ uid: string; displayName: string; zone?: string }>;
      const acceptor = acceptedBy?.find((a) => a.uid === firstAcceptedBy);

      data = {
        alertId,
        type: "alert_accepted",
        acceptedByName: acceptor?.displayName ?? "Unknown",
        acceptedByUid: firstAcceptedBy,
        acceptedByZone: acceptor?.zone ?? "",
      };
    } else if (
      afterStatus === AlertStatus.RESOLVED ||
      afterStatus === AlertStatus.CANCELLED ||
      afterStatus === AlertStatus.EXPIRED
    ) {
      data = {
        alertId,
        type: "alert_dismissed",
        reason: afterStatus,
      };
    } else {
      return;
    }

    await getMessaging().sendEachForMulticast({
      tokens,
      data,
      android: {
        priority: "high",
        ttl: 60000,
      },
    });
  },
);
