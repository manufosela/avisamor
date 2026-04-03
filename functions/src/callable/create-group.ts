import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { MemberRole, DEFAULT_PLAN_ID } from "../models/index.js";
import type { Group, GroupMember } from "../models/index.js";
import { validateDisplayName } from "../utils/validation.js";
import { validatePlanLimit } from "../helpers/plan-limits.js";

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

    const { name, groupName, role } = request.data as { name?: string; groupName?: string; role?: string };

    validateDisplayName(name);

    const resolvedGroupName = groupName?.trim() || name;

    if (!role || !Object.values(MemberRole).includes(role as MemberRole)) {
      throw new HttpsError("invalid-argument", "Valid role is required (alerter or responder)");
    }

    const db = getFirestore();

    // Check plan limit for groups (pass ownerUid as groupId for count)
    await validatePlanLimit(db, request.auth.uid, "groups", DEFAULT_PLAN_ID);

    const code = await generateUniqueCode(db);

    const groupRef = db.collection("groups").doc();
    const groupId = groupRef.id;

    const groupData: Omit<Group, "createdAt"> & { createdAt: FirebaseFirestore.FieldValue } = {
      groupId,
      code,
      name: resolvedGroupName,
      createdBy: request.auth.uid,
      createdAt: FieldValue.serverTimestamp(),
      alertExpirySeconds: 60,
      escalateTo112: false,
      escalateAfterSeconds: 0,
      planId: DEFAULT_PLAN_ID,
      blocked: false,
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
