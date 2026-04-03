"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMyData = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("firebase-admin/auth");
exports.deleteMyData = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required");
    }
    const uid = request.auth.uid;
    const db = (0, firestore_1.getFirestore)();
    // Find all group memberships
    const memberships = await db
        .collection("groupMembers")
        .where("uid", "==", uid)
        .get();
    const batch = db.batch();
    const groupsToCheck = [];
    for (const memberDoc of memberships.docs) {
        const data = memberDoc.data();
        groupsToCheck.push(data.groupId);
        batch.delete(memberDoc.ref);
    }
    // For each group, check if user was the creator and sole member
    for (const groupId of groupsToCheck) {
        const groupDoc = await db.collection("groups").doc(groupId).get();
        if (!groupDoc.exists)
            continue;
        const groupData = groupDoc.data();
        if (groupData.createdBy === uid) {
            // Check if there are other members
            const otherMembers = await db
                .collection("groupMembers")
                .where("groupId", "==", groupId)
                .where("uid", "!=", uid)
                .limit(1)
                .get();
            if (otherMembers.empty) {
                // Sole member: delete entire group, beacons, alerts, history
                batch.delete(groupDoc.ref);
                const beacons = await db
                    .collection("beacons")
                    .where("groupId", "==", groupId)
                    .get();
                for (const doc of beacons.docs)
                    batch.delete(doc.ref);
                const alerts = await db
                    .collection("alerts")
                    .where("groupId", "==", groupId)
                    .get();
                for (const doc of alerts.docs)
                    batch.delete(doc.ref);
                const history = await db
                    .collection("alertHistory")
                    .where("groupId", "==", groupId)
                    .get();
                for (const doc of history.docs)
                    batch.delete(doc.ref);
                const subscription = await db
                    .collection("subscriptions")
                    .doc(groupId)
                    .get();
                if (subscription.exists)
                    batch.delete(subscription.ref);
            }
        }
        // Anonymize user name in alerts they accepted
        const alertsWithUser = await db
            .collection("alerts")
            .where("groupId", "==", groupId)
            .get();
        for (const alertDoc of alertsWithUser.docs) {
            const alertData = alertDoc.data();
            const acceptedBy = alertData.acceptedBy;
            if (acceptedBy?.some((a) => a.uid === uid)) {
                const anonymized = acceptedBy.map((a) => a.uid === uid ? { ...a, displayName: "[eliminado]", uid: "deleted" } : a);
                batch.update(alertDoc.ref, { acceptedBy: anonymized });
            }
        }
    }
    await batch.commit();
    // Delete Firebase Auth user
    try {
        await (0, auth_1.getAuth)().deleteUser(uid);
    }
    catch (_) {
        // Auth deletion may fail if already deleted
    }
    return { deleted: true };
});
//# sourceMappingURL=delete-my-data.js.map