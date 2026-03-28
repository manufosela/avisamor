import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { MemberRole } from "../models/index.js";
import type { GroupMember } from "../models/index.js";

export const joinGroup = onCall(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const { code, displayName, role } = request.data as {
      code?: string;
      displayName?: string;
      role?: string;
    };

    if (!code || typeof code !== "string") {
      throw new HttpsError("invalid-argument", "Code is required");
    }

    if (!displayName || typeof displayName !== "string") {
      throw new HttpsError("invalid-argument", "Display name is required");
    }

    if (!role || !Object.values(MemberRole).includes(role as MemberRole)) {
      throw new HttpsError("invalid-argument", "Valid role is required (alerter or responder)");
    }

    const db = getFirestore();

    const groupSnapshot = await db
      .collection("groups")
      .where("code", "==", code)
      .limit(1)
      .get();

    if (groupSnapshot.empty) {
      throw new HttpsError("not-found", "Group not found with the provided code");
    }

    const groupDoc = groupSnapshot.docs[0];
    const groupData = groupDoc.data();
    const groupId = groupData.groupId as string;
    const groupName = groupData.name as string;

    const compositeKey = `${groupId}_${request.auth.uid}`;
    const memberRef = db.collection("groupMembers").doc(compositeKey);
    const memberDoc = await memberRef.get();

    if (memberDoc.exists) {
      throw new HttpsError("already-exists", "User is already a member of this group");
    }

    const memberData: Omit<GroupMember, "joinedAt"> & { joinedAt: FirebaseFirestore.FieldValue } = {
      memberId: compositeKey,
      uid: request.auth.uid,
      groupId,
      role: role as MemberRole,
      displayName,
      fcmToken: null,
      joinedAt: FieldValue.serverTimestamp(),
    };

    await memberRef.set(memberData);

    return { groupId, groupName };
  }
);
