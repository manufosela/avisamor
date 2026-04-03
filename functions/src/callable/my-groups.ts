import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";

export const myGroups = onCall(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const db = getFirestore();
    const uid = request.auth.uid;

    const memberships = await db
      .collection("groupMembers")
      .where("uid", "==", uid)
      .get();

    if (memberships.empty) {
      return { groups: [] };
    }

    const groups = await Promise.all(
      memberships.docs.map(async (memberDoc) => {
        const memberData = memberDoc.data();
        const groupDoc = await db.collection("groups").doc(memberData.groupId).get();
        if (!groupDoc.exists) return null;
        const groupData = groupDoc.data()!;
        return {
          groupId: memberData.groupId,
          groupName: groupData.name,
          code: groupData.code,
          role: memberData.role,
          blocked: groupData.blocked || false,
        };
      })
    );

    return { groups: groups.filter(Boolean) };
  }
);
