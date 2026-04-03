import { onCall } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";

export const getPlans = onCall(
  { region: "europe-west1" },
  async () => {
    const db = getFirestore();
    const snapshot = await db
      .collection("plans")
      .where("active", "==", true)
      .orderBy("order")
      .get();

    const plans = snapshot.docs.map((doc) => doc.data());
    return { plans };
  }
);
