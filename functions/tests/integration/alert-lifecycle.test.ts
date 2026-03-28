import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { getTestFirestore, clearFirestore, getTestApp, cleanupApp } from "./setup.js";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

const DEBOUNCE_SECONDS = 30;
const ALERT_EXPIRY_MS = 60_000;

describe("Alert Lifecycle Integration Tests", () => {
  const db = getTestFirestore();
  let groupId: string;

  beforeEach(async () => {
    await clearFirestore();

    // Create group
    const groupRef = db.collection("groups").doc();
    groupId = groupRef.id;

    await groupRef.set({
      groupId,
      code: "123456",
      name: "Test Family",
      createdBy: "user-alerter-1",
      createdAt: FieldValue.serverTimestamp(),
      alertExpirySeconds: 60,
      escalateTo112: false,
      escalateAfterSeconds: 0,
    });

    // Alerter member
    const alerterKey = `${groupId}_user-alerter-1`;
    await db.collection("groupMembers").doc(alerterKey).set({
      memberId: alerterKey,
      uid: "user-alerter-1",
      groupId,
      role: "alerter",
      displayName: "Alerter",
      fcmToken: null,
      joinedAt: FieldValue.serverTimestamp(),
    });

    // Responder member
    const responderKey = `${groupId}_user-responder-1`;
    await db.collection("groupMembers").doc(responderKey).set({
      memberId: responderKey,
      uid: "user-responder-1",
      groupId,
      role: "responder",
      displayName: "Responder",
      fcmToken: "test-fcm-token",
      joinedAt: FieldValue.serverTimestamp(),
    });
  });

  afterAll(async () => {
    await clearFirestore();
  });

  describe("Full alert flow", () => {
    it("should complete full lifecycle: create -> accept -> resolve", async () => {
      // 1. Create alert
      const alertRef = db.collection("alerts").doc();
      const alertId = alertRef.id;

      await alertRef.set({
        alertId,
        groupId,
        triggeredBy: "user-alerter-1",
        triggerSource: "pwa",
        status: "active",
        createdAt: FieldValue.serverTimestamp(),
        expiresAt: Timestamp.fromMillis(Date.now() + ALERT_EXPIRY_MS),
        acceptedBy: [],
        firstAcceptedBy: null,
        firstAcceptedAt: null,
      });

      let alertDoc = await alertRef.get();
      expect(alertDoc.exists).toBe(true);
      expect(alertDoc.data()!.status).toBe("active");

      // 2. Accept alert
      const now = Timestamp.now();
      await alertRef.update({
        status: "accepted",
        firstAcceptedBy: "user-responder-1",
        firstAcceptedAt: now,
        acceptedBy: FieldValue.arrayUnion({
          uid: "user-responder-1",
          displayName: "Responder",
          acceptedAt: now,
        }),
      });

      alertDoc = await alertRef.get();
      expect(alertDoc.data()!.status).toBe("accepted");
      expect(alertDoc.data()!.firstAcceptedBy).toBe("user-responder-1");
      expect(alertDoc.data()!.acceptedBy).toHaveLength(1);

      // 3. Resolve alert
      await alertRef.update({
        status: "resolved",
        resolvedAt: FieldValue.serverTimestamp(),
        resolvedBy: "user-responder-1",
      });

      // Archive to history
      const finalData = (await alertRef.get()).data()!;
      await db.collection("alertHistory").doc(alertId).set({
        ...finalData,
        archivedAt: FieldValue.serverTimestamp(),
      });

      alertDoc = await alertRef.get();
      expect(alertDoc.data()!.status).toBe("resolved");

      const historyDoc = await db.collection("alertHistory").doc(alertId).get();
      expect(historyDoc.exists).toBe(true);
      expect(historyDoc.data()!.status).toBe("resolved");
    });
  });

  describe("Debounce", () => {
    it("should detect active alert within debounce window", async () => {
      // Create first alert
      const alertRef = db.collection("alerts").doc();
      await alertRef.set({
        alertId: alertRef.id,
        groupId,
        triggeredBy: "user-alerter-1",
        triggerSource: "pwa",
        status: "active",
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromMillis(Date.now() + ALERT_EXPIRY_MS),
        acceptedBy: [],
        firstAcceptedBy: null,
        firstAcceptedAt: null,
      });

      // Check debounce: look for active alerts within the debounce window
      const debounceThreshold = Timestamp.fromMillis(Date.now() - DEBOUNCE_SECONDS * 1000);
      const recentAlerts = await db
        .collection("alerts")
        .where("groupId", "==", groupId)
        .where("status", "==", "active")
        .where("createdAt", ">", debounceThreshold)
        .get();

      // Should find the recent alert - meaning a second alert should be blocked
      expect(recentAlerts.empty).toBe(false);
      expect(recentAlerts.size).toBe(1);
    });
  });

  describe("Alert expiry", () => {
    it("should identify and expire alerts past their expiry time", async () => {
      // Create an alert that's already expired (expiresAt in the past)
      const alertRef = db.collection("alerts").doc();
      const alertId = alertRef.id;

      await alertRef.set({
        alertId,
        groupId,
        triggeredBy: "user-alerter-1",
        triggerSource: "pwa",
        status: "active",
        createdAt: Timestamp.fromMillis(Date.now() - 120_000), // 2 minutes ago
        expiresAt: Timestamp.fromMillis(Date.now() - 60_000),  // expired 1 minute ago
        acceptedBy: [],
        firstAcceptedBy: null,
        firstAcceptedAt: null,
      });

      // Simulate expireAlerts logic: find active alerts past expiry
      const now = Timestamp.now();
      const expiredSnap = await db
        .collection("alerts")
        .where("status", "==", "active")
        .where("expiresAt", "<=", now)
        .get();

      expect(expiredSnap.empty).toBe(false);
      expect(expiredSnap.size).toBe(1);

      // Expire the alert
      for (const doc of expiredSnap.docs) {
        const alertData = doc.data();
        await doc.ref.update({ status: "expired" });
        await db.collection("alertHistory").doc(doc.id).set({
          ...alertData,
          status: "expired",
          archivedAt: FieldValue.serverTimestamp(),
        });
      }

      // Verify alert is expired
      const expiredAlert = await alertRef.get();
      expect(expiredAlert.data()!.status).toBe("expired");

      // Verify it was archived
      const historyDoc = await db.collection("alertHistory").doc(alertId).get();
      expect(historyDoc.exists).toBe(true);
      expect(historyDoc.data()!.status).toBe("expired");
    });

    it("should not expire active alerts before their expiry time", async () => {
      // Create an alert that hasn't expired yet
      const alertRef = db.collection("alerts").doc();
      await alertRef.set({
        alertId: alertRef.id,
        groupId,
        triggeredBy: "user-alerter-1",
        triggerSource: "pwa",
        status: "active",
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromMillis(Date.now() + ALERT_EXPIRY_MS),
        acceptedBy: [],
        firstAcceptedBy: null,
        firstAcceptedAt: null,
      });

      const now = Timestamp.now();
      const expiredSnap = await db
        .collection("alerts")
        .where("status", "==", "active")
        .where("expiresAt", "<=", now)
        .get();

      expect(expiredSnap.empty).toBe(true);
    });
  });
});
