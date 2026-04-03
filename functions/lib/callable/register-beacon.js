"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listBeacons = exports.registerBeacon = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const validation_js_1 = require("../utils/validation.js");
const plan_limits_js_1 = require("../helpers/plan-limits.js");
exports.registerBeacon = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required");
    }
    const { groupId, beaconId, zoneName, floor, rssiAtOneMeter } = request.data;
    (0, validation_js_1.validateGroupId)(groupId);
    (0, validation_js_1.validateBeaconId)(beaconId);
    (0, validation_js_1.validateZoneName)(zoneName);
    if (floor === undefined || typeof floor !== "number") {
        throw new https_1.HttpsError("invalid-argument", "floor is required (number)");
    }
    const db = (0, firestore_1.getFirestore)();
    const groupDoc = await db.collection("groups").doc(groupId).get();
    if (!groupDoc.exists) {
        throw new https_1.HttpsError("not-found", "Group not found");
    }
    if (groupDoc.data()?.createdBy !== request.auth.uid) {
        throw new https_1.HttpsError("permission-denied", "Only the group creator can register beacons");
    }
    await (0, plan_limits_js_1.checkGroupNotBlocked)(db, groupId);
    await (0, plan_limits_js_1.validatePlanLimit)(db, groupId, "beacons");
    const existingBeacon = await db
        .collection("beacons")
        .where("beaconId", "==", beaconId)
        .where("groupId", "==", groupId)
        .limit(1)
        .get();
    if (!existingBeacon.empty) {
        throw new https_1.HttpsError("already-exists", "Beacon already registered in this group");
    }
    const beaconRef = db.collection("beacons").doc();
    const beaconData = {
        beaconId,
        groupId,
        zoneName,
        floor,
        rssiAtOneMeter: rssiAtOneMeter ?? -59,
        active: true,
        createdBy: request.auth.uid,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
    };
    await beaconRef.set(beaconData);
    return { id: beaconRef.id, beaconId, zoneName, floor };
});
exports.listBeacons = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required");
    }
    const { groupId } = request.data;
    if (!groupId || typeof groupId !== "string") {
        throw new https_1.HttpsError("invalid-argument", "groupId is required");
    }
    const db = (0, firestore_1.getFirestore)();
    const memberDoc = await db
        .collection("groupMembers")
        .doc(`${groupId}_${request.auth.uid}`)
        .get();
    if (!memberDoc.exists) {
        throw new https_1.HttpsError("permission-denied", "You are not a member of this group");
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
});
//# sourceMappingURL=register-beacon.js.map