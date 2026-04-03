"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlans = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
exports.getPlans = (0, https_1.onCall)({ region: "europe-west1" }, async () => {
    const db = (0, firestore_1.getFirestore)();
    const snapshot = await db
        .collection("plans")
        .where("active", "==", true)
        .orderBy("order")
        .get();
    const plans = snapshot.docs.map((doc) => doc.data());
    return { plans };
});
//# sourceMappingURL=get-plans.js.map