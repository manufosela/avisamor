import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { MemberRole } from "../models/index.js";
import type { GroupMember } from "../models/index.js";
import { validatePlanLimit, checkGroupNotBlocked } from "../helpers/plan-limits.js";

export const joinGroup = onCall(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const { code, role } = request.data as {
      code?: string;
      role?: string;
    };

    if (!code || typeof code !== "string" || code.trim().length < 3) {
      throw new HttpsError("invalid-argument", "Group code is required");
    }

    if (!role || !Object.values(MemberRole).includes(role as MemberRole)) {
      throw new HttpsError("invalid-argument", "Valid role is required (alerter or responder)");
    }

    const db = getFirestore();
    const normalizedCode = code.trim().toLowerCase();

    const groupSnapshot = await db
      .collection("groups")
      .where("code", "==", normalizedCode)
      .limit(1)
      .get();

    if (groupSnapshot.empty) {
      throw new HttpsError("not-found", "No se encontró un grupo con ese código");
    }

    const groupDoc = groupSnapshot.docs[0];
    const groupData = groupDoc.data();
    const groupId = groupData.groupId as string;
    const groupName = groupData.name as string;

    await checkGroupNotBlocked(db, groupId);
    await validatePlanLimit(db, groupId, "members");

    const compositeKey = `${groupId}_${request.auth.uid}`;
    const memberRef = db.collection("groupMembers").doc(compositeKey);
    const memberDoc = await memberRef.get();

    if (memberDoc.exists) {
      throw new HttpsError("already-exists", "Ya eres miembro de este grupo");
    }

    const displayName = request.auth.token?.name || request.auth.token?.email || "Usuario";

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
