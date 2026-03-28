import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { MemberRole } from "../models/index.js";
import type { Group, GroupMember } from "../models/index.js";

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function generateUniqueCode(db: FirebaseFirestore.Firestore): Promise<string> {
  const maxAttempts = 10;
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateCode();
    const snapshot = await db
      .collection("groups")
      .where("code", "==", code)
      .limit(1)
      .get();
    if (snapshot.empty) {
      return code;
    }
  }
  throw new HttpsError("internal", "Unable to generate unique code");
}

export const createGroup = onCall(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const { name, role } = request.data as { name?: string; role?: string };

    if (!name || typeof name !== "string") {
      throw new HttpsError("invalid-argument", "Name is required");
    }

    if (!role || !Object.values(MemberRole).includes(role as MemberRole)) {
      throw new HttpsError("invalid-argument", "Valid role is required (alerter or responder)");
    }

    const db = getFirestore();
    const code = await generateUniqueCode(db);

    const groupRef = db.collection("groups").doc();
    const groupId = groupRef.id;

    const groupData: Omit<Group, "createdAt"> & { createdAt: FirebaseFirestore.FieldValue } = {
      groupId,
      code,
      name,
      createdBy: request.auth.uid,
      createdAt: FieldValue.serverTimestamp(),
      alertExpirySeconds: 60,
      escalateTo112: false,
      escalateAfterSeconds: 0,
    };

    await groupRef.set(groupData);

    const compositeKey = `${groupId}_${request.auth.uid}`;
    const memberData: Omit<GroupMember, "joinedAt"> & { joinedAt: FirebaseFirestore.FieldValue } = {
      memberId: compositeKey,
      uid: request.auth.uid,
      groupId,
      role: role as MemberRole,
      displayName: name,
      fcmToken: null,
      joinedAt: FieldValue.serverTimestamp(),
    };

    await db.collection("groupMembers").doc(compositeKey).set(memberData);

    return { groupId, code };
  }
);
