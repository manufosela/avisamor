import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGet = vi.fn();
const mockWhere = vi.fn();
const mockDoc = vi.fn();
const mockCollection = vi.fn();

const mockDb = {
  collection: mockCollection,
};

mockWhere.mockReturnValue({ where: mockWhere, get: mockGet });
mockCollection.mockReturnValue({ where: mockWhere, doc: mockDoc });

vi.mock("firebase-admin/firestore", () => ({
  getFirestore: () => mockDb,
}));

vi.mock("firebase-admin/app", () => ({
  initializeApp: vi.fn(),
  getApps: () => [{}],
}));

const mockSendEachForMulticast = vi.fn();

vi.mock("firebase-admin/messaging", () => ({
  getMessaging: () => ({
    sendEachForMulticast: mockSendEachForMulticast,
  }),
}));

let capturedHandler: (event: unknown) => Promise<void>;

vi.mock("firebase-functions/v2/firestore", () => ({
  onDocumentUpdated: (path: string, handler: (event: unknown) => Promise<void>) => {
    capturedHandler = handler;
    return handler;
  },
}));

describe("onAlertUpdated trigger", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    mockCollection.mockReturnValue({ where: mockWhere, doc: mockDoc });
    mockWhere.mockReturnValue({ where: mockWhere, get: mockGet });
  });

  it("should do nothing if status did not change", async () => {
    await import("./on-alert-updated.js");

    await capturedHandler({
      params: { alertId: "a1" },
      data: {
        before: { data: () => ({ status: "active", groupId: "g1" }) },
        after: { data: () => ({ status: "active", groupId: "g1" }) },
      },
    });

    expect(mockSendEachForMulticast).not.toHaveBeenCalled();
  });

  it("should do nothing if no data in event", async () => {
    await import("./on-alert-updated.js");

    await capturedHandler({
      params: { alertId: "a1" },
      data: undefined,
    });

    expect(mockSendEachForMulticast).not.toHaveBeenCalled();
  });

  it("should send alert_accepted FCM to all group members when status changes to accepted", async () => {
    // Mock all group members
    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [
        { data: () => ({ uid: "alerter1", fcmToken: "token-a", displayName: "Alerter" }) },
        { data: () => ({ uid: "r1", fcmToken: "token-r1", displayName: "Resp1" }) },
        { data: () => ({ uid: "r2", fcmToken: null, displayName: "Resp2" }) },
      ],
    });

    mockSendEachForMulticast.mockResolvedValueOnce({
      successCount: 2,
      failureCount: 0,
      responses: [{ success: true }, { success: true }],
    });

    await import("./on-alert-updated.js");

    await capturedHandler({
      params: { alertId: "a1" },
      data: {
        before: { data: () => ({ status: "active", groupId: "g1" }) },
        after: {
          data: () => ({
            status: "accepted",
            groupId: "g1",
            firstAcceptedBy: "r1",
            acceptedBy: [{ uid: "r1", displayName: "Resp1" }],
          }),
        },
      },
    });

    expect(mockSendEachForMulticast).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: ["token-a", "token-r1"],
        data: {
          alertId: "a1",
          type: "alert_accepted",
          acceptedByName: "Resp1",
          acceptedByUid: "r1",
        },
      }),
    );
  });

  it("should send alert_dismissed FCM when status changes to resolved", async () => {
    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [
        { data: () => ({ uid: "u1", fcmToken: "token-1", displayName: "User1" }) },
      ],
    });

    mockSendEachForMulticast.mockResolvedValueOnce({
      successCount: 1,
      failureCount: 0,
      responses: [{ success: true }],
    });

    await import("./on-alert-updated.js");

    await capturedHandler({
      params: { alertId: "a1" },
      data: {
        before: { data: () => ({ status: "accepted", groupId: "g1" }) },
        after: { data: () => ({ status: "resolved", groupId: "g1" }) },
      },
    });

    expect(mockSendEachForMulticast).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          alertId: "a1",
          type: "alert_dismissed",
          reason: "resolved",
        },
      }),
    );
  });

  it("should send alert_dismissed FCM when status changes to cancelled", async () => {
    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [
        { data: () => ({ uid: "u1", fcmToken: "token-1", displayName: "User1" }) },
      ],
    });

    mockSendEachForMulticast.mockResolvedValueOnce({
      successCount: 1,
      failureCount: 0,
      responses: [{ success: true }],
    });

    await import("./on-alert-updated.js");

    await capturedHandler({
      params: { alertId: "a1" },
      data: {
        before: { data: () => ({ status: "active", groupId: "g1" }) },
        after: { data: () => ({ status: "cancelled", groupId: "g1" }) },
      },
    });

    expect(mockSendEachForMulticast).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          alertId: "a1",
          type: "alert_dismissed",
          reason: "cancelled",
        },
      }),
    );
  });

  it("should send alert_dismissed FCM when status changes to expired", async () => {
    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [
        { data: () => ({ uid: "u1", fcmToken: "token-1", displayName: "User1" }) },
      ],
    });

    mockSendEachForMulticast.mockResolvedValueOnce({
      successCount: 1,
      failureCount: 0,
      responses: [{ success: true }],
    });

    await import("./on-alert-updated.js");

    await capturedHandler({
      params: { alertId: "a1" },
      data: {
        before: { data: () => ({ status: "active", groupId: "g1" }) },
        after: { data: () => ({ status: "expired", groupId: "g1" }) },
      },
    });

    expect(mockSendEachForMulticast).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          alertId: "a1",
          type: "alert_dismissed",
          reason: "expired",
        },
      }),
    );
  });

  it("should not send FCM if no tokens available", async () => {
    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [
        { data: () => ({ uid: "u1", fcmToken: null, displayName: "User1" }) },
      ],
    });

    await import("./on-alert-updated.js");

    await capturedHandler({
      params: { alertId: "a1" },
      data: {
        before: { data: () => ({ status: "active", groupId: "g1" }) },
        after: { data: () => ({ status: "resolved", groupId: "g1" }) },
      },
    });

    expect(mockSendEachForMulticast).not.toHaveBeenCalled();
  });

  it("should ignore transitions from non-relevant states (e.g. active to active)", async () => {
    await import("./on-alert-updated.js");

    await capturedHandler({
      params: { alertId: "a1" },
      data: {
        before: { data: () => ({ status: "active", groupId: "g1" }) },
        after: { data: () => ({ status: "active", groupId: "g1" }) },
      },
    });

    expect(mockCollection).not.toHaveBeenCalled();
  });
});
