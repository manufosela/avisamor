import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import type { Beacon } from "../models/index.js";
import { validateGroupId, validateBeaconId, validateZoneName } from "../utils/validation.js";
import { validatePlanLimit, checkGroupNotBlocked } from "../helpers/plan-limits.js";

export const registerBeacon = onCall(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const { groupId, beaconId, zoneName, floor, rssiAtOneMeter } = request.data as {
      groupId?: string;
      beaconId?: string;
      zoneName?: string;
      floor?: number;
      rssiAtOneMeter?: number;
    };

    validateGroupId(groupId);
    validateBeaconId(beaconId);
    validateZoneName(zoneName);
    if (floor === undefined || typeof floor !== "number") {
      throw new HttpsError("invalid-argument", "floor is required (number)");
    }

    const db = getFirestore();

    const groupDoc = await db.collection("groups").doc(groupId).get();
    if (!groupDoc.exists) {
      throw new HttpsError("not-found", "Group not found");
    }
    if (groupDoc.data()?.createdBy !== request.auth.uid) {
      throw new HttpsError("permission-denied", "Only the group creator can register beacons");
    }

    await checkGroupNotBlocked(db, groupId);
    await validatePlanLimit(db, groupId, "beacons");

    const existingBeacon = await db
      .collection("beacons")
      .where("beaconId", "==", beaconId)
      .where("groupId", "==", groupId)
      .limit(1)
      .get();

    if (!existingBeacon.empty) {
      throw new HttpsError("already-exists", "Beacon already registered in this group");
    }

    const beaconRef = db.collection("beacons").doc();
    const beaconData: Omit<Beacon, "createdAt"> & { createdAt: FirebaseFirestore.FieldValue } = {
      beaconId,
      groupId,
      zoneName,
      floor,
      rssiAtOneMeter: rssiAtOneMeter ?? -59,
      active: true,
      createdBy: request.auth.uid,
      createdAt: FieldValue.serverTimestamp(),
    };

    await beaconRef.set(beaconData);

    return { id: beaconRef.id, beaconId, zoneName, floor };
  }
);

export const listBeacons = onCall(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const { groupId } = request.data as { groupId?: string };

    if (!groupId || typeof groupId !== "string") {
      throw new HttpsError("invalid-argument", "groupId is required");
    }

    const db = getFirestore();

    const memberDoc = await db
      .collection("groupMembers")
      .doc(`${groupId}_${request.auth.uid}`)
      .get();

    if (!memberDoc.exists) {
      throw new HttpsError("permission-denied", "You are not a member of this group");
    }

    const snapshot = await db
      .collection("beacons")
      .where("groupId", "==", groupId)
      .where("active", "==", true)
      .get();

    const beacons = snapshot.docs.map((doc) => ({
      id: doc.id,
      beaconId: doc.data().beaconId,
      zoneName: doc.data().zoneName,
      floor: doc.data().floor,
      rssiAtOneMeter: doc.data().rssiAtOneMeter,
    }));

    return { beacons };
  }
);
