"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMemberZone = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const RATE_LIMIT_MS = 30_000;
exports.updateMemberZone = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required");
    }
    const { groupId, zone, beaconId } = request.data;
    if (!groupId || typeof groupId !== "string") {
        throw new https_1.HttpsError("invalid-argument", "groupId is required");
    }
    if (!zone || typeof zone !== "string") {
        throw new https_1.HttpsError("invalid-argument", "zone is required");
    }
    const db = (0, firestore_1.getFirestore)();
    const memberId = `${groupId}_${request.auth.uid}`;
    const memberRef = db.collection("groupMembers").doc(memberId);
    const memberDoc = await memberRef.get();
    if (!memberDoc.exists) {
        throw new https_1.HttpsError("permission-denied", "You are not a member of this group");
    }
    if (beaconId) {
        const beaconSnapshot = await db
            .collection("beacons")
            .where("beaconId", "==", beaconId)
            .where("groupId", "==", groupId)
            .where("active", "==", true)
            .limit(1)
            .get();
        if (beaconSnapshot.empty) {
            throw new https_1.HttpsError("invalid-argument", "Beacon not found or not active in this group");
        }
    }
    const memberData = memberDoc.data();
    const lastUpdate = memberData?.currentZoneUpdatedAt;
    if (lastUpdate) {
        const elapsed = Date.now() - lastUpdate.toMillis();
        if (elapsed < RATE_LIMIT_MS) {
            throw new https_1.HttpsError("resource-exhausted", `Rate limit: wait ${Math.ceil((RATE_LIMIT_MS - elapsed) / 1000)}s before updating zone`);
        }
    }
    await memberRef.update({
        currentZone: zone,
        currentZoneUpdatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return { zone };
});
//# sourceMappingURL=update-member-zone.js.map