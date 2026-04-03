import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

function requireAdmin(request: { auth?: { uid: string; token?: Record<string, unknown> } }) {
  if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required");
  if (request.auth.token?.admin !== true) throw new HttpsError("permission-denied", "Admin access required");
}

export const adminListUsers = onCall(
  { region: "europe-west1" },
  async (request) => {
    requireAdmin(request);

    const listResult = await getAuth().listUsers(1000);
    const db = getFirestore();

    const users = await Promise.all(
      listResult.users.map(async (user) => {
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
      })
    );

    return { users };
  }
);

export const adminUpdateUser = onCall(
  { region: "europe-west1" },
  async (request) => {
    requireAdmin(request);
    const { uid, isAdmin } = request.data as { uid?: string; isAdmin?: boolean };
    if (!uid) throw new HttpsError("invalid-argument", "uid required");

    if (isAdmin !== undefined) {
      await getAuth().setCustomUserClaims(uid, { admin: isAdmin });
    }

    return { success: true };
  }
);

export const adminDeleteUser = onCall(
  { region: "europe-west1" },
  async (request) => {
    requireAdmin(request);
    const { uid } = request.data as { uid?: string };
    if (!uid) throw new HttpsError("invalid-argument", "uid required");
    if (uid === request.auth!.uid) throw new HttpsError("invalid-argument", "Cannot delete yourself");

    const db = getFirestore();

    // Remove from all groups
    const memberships = await db.collection("groupMembers").where("uid", "==", uid).get();
    const batch = db.batch();
    memberships.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    // Delete auth user
    await getAuth().deleteUser(uid);

    return { success: true };
  }
);
