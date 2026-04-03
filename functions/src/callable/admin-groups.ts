import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { MemberRole, DEFAULT_PLAN_ID } from "../models/index.js";
import { generateUniqueGroupCode } from "../utils/group-code.js";

function requireAdmin(request: { auth?: { uid: string; token?: Record<string, unknown> } }) {
  if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required");
  if (request.auth.token?.admin !== true) throw new HttpsError("permission-denied", "Admin access required");
}

export const adminGetGroup = onCall(
  { region: "europe-west1" },
  async (request) => {
    requireAdmin(request);
    const { groupId } = request.data as { groupId?: string };
    if (!groupId) throw new HttpsError("invalid-argument", "groupId required");

    const db = getFirestore();
    const groupDoc = await db.collection("groups").doc(groupId).get();
    if (!groupDoc.exists) throw new HttpsError("not-found", "Group not found");
    const group = groupDoc.data()!;

    const members = (await db.collection("groupMembers").where("groupId", "==", groupId).get())
      .docs.map(d => ({ id: d.id, ...d.data() }));

    const beacons = (await db.collection("beacons").where("groupId", "==", groupId).where("active", "==", true).get())
      .docs.map(d => ({ id: d.id, ...d.data() }));

    let alerts: Record<string, unknown>[] = [];
    try {
      const alertDocs = await db.collection("alerts")
        .where("groupId", "==", groupId)
        .orderBy("createdAt", "desc")
        .limit(20)
        .get();
      alerts = alertDocs.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch { /* index may not exist */ }

    if (alerts.length === 0) {
      try {
        const historyDocs = await db.collection("alertHistory")
          .where("groupId", "==", groupId)
          .orderBy("createdAt", "desc")
          .limit(20)
          .get();
        alerts = historyDocs.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch { /* index may not exist */ }
    }

    return {
      group: { groupId, ...group },
      members,
      beacons,
      alerts,
    };
  }
);

export const adminCreateGroupFromAdmin = onCall(
  { region: "europe-west1" },
  async (request) => {
    requireAdmin(request);
    const { groupName, planId } = request.data as { groupName?: string; planId?: string };
    if (!groupName || groupName.trim().length < 2) throw new HttpsError("invalid-argument", "Group name required");

    const db = getFirestore();
    const code = await generateUniqueGroupCode(db);
    const groupRef = db.collection("groups").doc();

    await groupRef.set({
      groupId: groupRef.id,
      code,
      name: groupName.trim(),
      createdBy: request.auth!.uid,
      createdAt: FieldValue.serverTimestamp(),
      alertExpirySeconds: 60,
      escalateTo112: false,
      escalateAfterSeconds: 0,
      planId: planId || DEFAULT_PLAN_ID,
      blocked: false,
    });

    return { groupId: groupRef.id, code };
  }
);

export const adminUpdateMember = onCall(
  { region: "europe-west1" },
  async (request) => {
    requireAdmin(request);
    const { memberId, role } = request.data as { memberId?: string; role?: string };
    if (!memberId) throw new HttpsError("invalid-argument", "memberId required");
    if (!role || !Object.values(MemberRole).includes(role as MemberRole)) {
      throw new HttpsError("invalid-argument", "Valid role required");
    }

    const db = getFirestore();
    const ref = db.collection("groupMembers").doc(memberId);
    const doc = await ref.get();
    if (!doc.exists) throw new HttpsError("not-found", "Member not found");

    await ref.update({ role });
    return { success: true };
  }
);

export const adminDeleteMember = onCall(
  { region: "europe-west1" },
  async (request) => {
    requireAdmin(request);
    const { memberId } = request.data as { memberId?: string };
    if (!memberId) throw new HttpsError("invalid-argument", "memberId required");

    const db = getFirestore();
    await db.collection("groupMembers").doc(memberId).delete();
    return { success: true };
  }
);

export const adminDeleteBeacon = onCall(
  { region: "europe-west1" },
  async (request) => {
    requireAdmin(request);
    const { beaconId } = request.data as { beaconId?: string };
    if (!beaconId) throw new HttpsError("invalid-argument", "beaconId required");

    const db = getFirestore();
    await db.collection("beacons").doc(beaconId).update({ active: false });
    return { success: true };
  }
);
