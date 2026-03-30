import { onCall } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { SEED_PLANS } from "../models/index.js";

export const getPlans = onCall(
  { region: "europe-west1" },
  async () => {
    const db = getFirestore();
    const snapshot = await db
      .collection("plans")
      .where("active", "==", true)
      .orderBy("order")
      .get();

    if (snapshot.empty) {
      // Auto-seed plans on first call
      const batch = db.batch();
      for (const plan of SEED_PLANS) {
        batch.set(db.collection("plans").doc(plan.planId), {
          ...plan,
          active: true,
        });
      }
      await batch.commit();

      return {
        plans: SEED_PLANS.map((p) => ({ ...p, active: true })),
      };
    }

    const plans = snapshot.docs.map((doc) => doc.data());
    return { plans };
  }
);
