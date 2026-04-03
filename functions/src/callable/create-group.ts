import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { MemberRole, DEFAULT_PLAN_ID } from "../models/index.js";
import type { Group, GroupMember } from "../models/index.js";
import { validatePlanLimit } from "../helpers/plan-limits.js";
import { generateUniqueGroupCode } from "../utils/group-code.js";

export const createGroup = onCall(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const { groupName, role } = request.data as {
      groupName?: string;
      role?: string;
    };

    if (!groupName || typeof groupName !== "string" || groupName.trim().length < 2) {
      throw new HttpsError("invalid-argument", "Group name is required (min 2 chars)");
    }

    if (!role || !Object.values(MemberRole).includes(role as MemberRole)) {
      throw new HttpsError("invalid-argument", "Valid role is required (alerter or responder)");
    }

    const db = getFirestore();

    await validatePlanLimit(db, request.auth.uid, "groups", DEFAULT_PLAN_ID);

    const code = await generateUniqueGroupCode(db);
    const groupRef = db.collection("groups").doc();
    const groupId = groupRef.id;

    const displayName = request.auth.token?.name || request.auth.token?.email || "Usuario";

    const groupData: Omit<Group, "createdAt"> & { createdAt: FirebaseFirestore.FieldValue } = {
      groupId,
      code,
      name: groupName.trim(),
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
      displayName,
      fcmToken: null,
      joinedAt: FieldValue.serverTimestamp(),
    };

    await db.collection("groupMembers").doc(compositeKey).set(memberData);

    return { groupId, code, groupName: groupName.trim() };
  }
);
