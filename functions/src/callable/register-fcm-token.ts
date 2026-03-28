import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";

export const registerFcmToken = onCall(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const { groupId, fcmToken } = request.data as {
      groupId?: string;
      fcmToken?: string;
    };

    if (!groupId || typeof groupId !== "string") {
      throw new HttpsError("invalid-argument", "Group ID is required");
    }

    if (!fcmToken || typeof fcmToken !== "string") {
      throw new HttpsError("invalid-argument", "FCM token is required");
    }

    const db = getFirestore();
    const compositeKey = `${groupId}_${request.auth.uid}`;
    const memberRef = db.collection("groupMembers").doc(compositeKey);
    const memberDoc = await memberRef.get();

    if (!memberDoc.exists) {
      throw new HttpsError("not-found", "User is not a member of this group");
    }

    await memberRef.update({ fcmToken });

    return { success: true };
  }
);
