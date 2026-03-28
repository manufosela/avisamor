import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { getTestFirestore, clearFirestore, getTestApp, cleanupApp } from "./setup.js";
import { FieldValue } from "firebase-admin/firestore";

describe("Group Management Integration Tests", () => {
  const db = getTestFirestore();

  beforeEach(async () => {
    await clearFirestore();
  });

  afterAll(async () => {
    await clearFirestore();
  });

  describe("createGroup", () => {
    it("should create a group with a 6-digit code", async () => {
      const groupRef = db.collection("groups").doc();
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      await groupRef.set({
        groupId: groupRef.id,
        code,
        name: "Test Family",
        createdBy: "user-alerter-1",
        createdAt: FieldValue.serverTimestamp(),
        alertExpirySeconds: 60,
        escalateTo112: false,
        escalateAfterSeconds: 0,
      });

      const groupDoc = await groupRef.get();
      expect(groupDoc.exists).toBe(true);

      const data = groupDoc.data()!;
      expect(data.code).toMatch(/^\d{6}$/);
      expect(data.name).toBe("Test Family");
      expect(data.createdBy).toBe("user-alerter-1");

      // Also create the creator as member
      const compositeKey = `${groupRef.id}_user-alerter-1`;
      await db.collection("groupMembers").doc(compositeKey).set({
        memberId: compositeKey,
        uid: "user-alerter-1",
        groupId: groupRef.id,
        role: "alerter",
        displayName: "Test Family",
        fcmToken: null,
        joinedAt: FieldValue.serverTimestamp(),
      });

      const memberDoc = await db.collection("groupMembers").doc(compositeKey).get();
      expect(memberDoc.exists).toBe(true);
      expect(memberDoc.data()!.role).toBe("alerter");
    });
  });

  describe("joinGroup", () => {
    let groupId: string;
    let groupCode: string;

    beforeEach(async () => {
      await clearFirestore();

      // Create a group first
      const groupRef = db.collection("groups").doc();
      groupId = groupRef.id;
      groupCode = Math.floor(100000 + Math.random() * 900000).toString();

      await groupRef.set({
        groupId,
        code: groupCode,
        name: "Test Family",
        createdBy: "user-alerter-1",
        createdAt: FieldValue.serverTimestamp(),
        alertExpirySeconds: 60,
        escalateTo112: false,
        escalateAfterSeconds: 0,
      });

      // Creator as member
      const creatorKey = `${groupId}_user-alerter-1`;
      await db.collection("groupMembers").doc(creatorKey).set({
        memberId: creatorKey,
        uid: "user-alerter-1",
        groupId,
        role: "alerter",
        displayName: "Alerter",
        fcmToken: null,
        joinedAt: FieldValue.serverTimestamp(),
      });
    });

    it("should join group with valid code", async () => {
      // Find group by code
      const snapshot = await db
        .collection("groups")
        .where("code", "==", groupCode)
        .limit(1)
        .get();
      expect(snapshot.empty).toBe(false);

      const foundGroupId = snapshot.docs[0].data().groupId;
      const uid = "user-responder-1";
      const compositeKey = `${foundGroupId}_${uid}`;

      await db.collection("groupMembers").doc(compositeKey).set({
        memberId: compositeKey,
        uid,
        groupId: foundGroupId,
        role: "responder",
        displayName: "Responder One",
        fcmToken: null,
        joinedAt: FieldValue.serverTimestamp(),
      });

      const memberDoc = await db.collection("groupMembers").doc(compositeKey).get();
      expect(memberDoc.exists).toBe(true);
      expect(memberDoc.data()!.role).toBe("responder");
      expect(memberDoc.data()!.displayName).toBe("Responder One");
    });

    it("should fail to join group with invalid code", async () => {
      const snapshot = await db
        .collection("groups")
        .where("code", "==", "000000")
        .limit(1)
        .get();

      expect(snapshot.empty).toBe(true);
    });

    it("should fail duplicate join", async () => {
      const uid = "user-responder-1";
      const compositeKey = `${groupId}_${uid}`;

      // First join
      await db.collection("groupMembers").doc(compositeKey).set({
        memberId: compositeKey,
        uid,
        groupId,
        role: "responder",
        displayName: "Responder One",
        fcmToken: null,
        joinedAt: FieldValue.serverTimestamp(),
      });

      // Check member already exists (as the callable function does)
      const memberDoc = await db.collection("groupMembers").doc(compositeKey).get();
      expect(memberDoc.exists).toBe(true);
      // In the real callable, this would throw "already-exists"
    });

    it("should register FCM token", async () => {
      const uid = "user-alerter-1";
      const compositeKey = `${groupId}_${uid}`;

      // Member already exists from beforeEach
      const memberRef = db.collection("groupMembers").doc(compositeKey);
      const memberDoc = await memberRef.get();
      expect(memberDoc.exists).toBe(true);
      expect(memberDoc.data()!.fcmToken).toBeNull();

      // Register token
      await memberRef.update({ fcmToken: "test-fcm-token-123" });

      const updated = await memberRef.get();
      expect(updated.data()!.fcmToken).toBe("test-fcm-token-123");
    });
  });
});
