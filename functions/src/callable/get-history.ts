import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { validateGroupId } from "../utils/validation.js";

export const getHistory = onCall(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const { groupId, limit: requestedLimit, startAfter } = request.data as {
      groupId?: string;
      limit?: number;
      startAfter?: string;
    };

    validateGroupId(groupId);

    const db = getFirestore();
    const uid = request.auth.uid;

    // Validate user is member of group
    const memberDoc = await db
      .collection("groupMembers")
      .doc(`${groupId}_${uid}`)
      .get();

    if (!memberDoc.exists) {
      throw new HttpsError("permission-denied", "Not a member of this group");
    }

    const pageSize = Math.min(requestedLimit ?? 50, 100);

    let query = db
      .collection("alertHistory")
      .where("groupId", "==", groupId)
      .orderBy("createdAt", "desc");

    if (startAfter && typeof startAfter === "string") {
      const cursorDoc = await db.collection("alertHistory").doc(startAfter).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    // Fetch one extra to determine hasMore
    const snap = await query.limit(pageSize + 1).get();

    const hasMore = snap.docs.length > pageSize;
    const alerts = snap.docs
      .slice(0, pageSize)
      .map((doc) => doc.data());

    return { alerts, hasMore };
  },
);
