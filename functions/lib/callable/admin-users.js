"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminDeleteUser = exports.adminUpdateUser = exports.adminListUsers = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("firebase-admin/auth");
function requireAdmin(request) {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Authentication required");
    if (request.auth.token?.admin !== true)
        throw new https_1.HttpsError("permission-denied", "Admin access required");
}
exports.adminListUsers = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    requireAdmin(request);
    const listResult = await (0, auth_1.getAuth)().listUsers(1000);
    const db = (0, firestore_1.getFirestore)();
    const users = await Promise.all(listResult.users.map(async (user) => {
        const memberships = await db.collection("groupMembers")
            .where("uid", "==", user.uid)
            .get();
        return {
            uid: user.uid,
            displayName: user.displayName || "",
            email: user.email || "",
            photoURL: user.photoURL || "",
            isAdmin: user.customClaims?.admin === true,
            groupCount: memberships.size,
            lastSignIn: user.metadata.lastSignInTime || null,
        };
    }));
    return { users };
});
exports.adminUpdateUser = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    requireAdmin(request);
    const { uid, isAdmin } = request.data;
    if (!uid)
        throw new https_1.HttpsError("invalid-argument", "uid required");
    if (isAdmin !== undefined) {
        await (0, auth_1.getAuth)().setCustomUserClaims(uid, { admin: isAdmin });
    }
    return { success: true };
});
exports.adminDeleteUser = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    requireAdmin(request);
    const { uid } = request.data;
    if (!uid)
        throw new https_1.HttpsError("invalid-argument", "uid required");
    if (uid === request.auth.uid)
        throw new https_1.HttpsError("invalid-argument", "Cannot delete yourself");
    const db = (0, firestore_1.getFirestore)();
    // Remove from all groups
    const memberships = await db.collection("groupMembers").where("uid", "==", uid).get();
    const batch = db.batch();
    memberships.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    // Delete auth user
    await (0, auth_1.getAuth)().deleteUser(uid);
    return { success: true };
});
//# sourceMappingURL=admin-users.js.map