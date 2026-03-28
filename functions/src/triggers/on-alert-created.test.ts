import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGet = vi.fn();
const mockWhere = vi.fn();
const mockDoc = vi.fn();
const mockCollection = vi.fn();
const mockUpdate = vi.fn().mockResolvedValue(undefined);

const mockDb = {
  collection: mockCollection,
};

mockDoc.mockReturnValue({ update: mockUpdate });
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
  onDocumentCreated: (path: string, handler: (event: unknown) => Promise<void>) => {
    capturedHandler = handler;
    return handler;
  },
}));

describe("onAlertCreated trigger", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    mockCollection.mockReturnValue({ where: mockWhere, doc: mockDoc });
    mockWhere.mockReturnValue({ where: mockWhere, get: mockGet });
    mockDoc.mockReturnValue({ update: mockUpdate });
  });

  it("should do nothing if alert status is not active", async () => {
    await import("./on-alert-created.js");

    await capturedHandler({
      params: { alertId: "a1" },
      data: {
        data: () => ({ status: "resolved", groupId: "g1", triggeredBy: "u1" }),
      },
    });

    expect(mockSendEachForMulticast).not.toHaveBeenCalled();
  });

  it("should do nothing if no data in event", async () => {
    await import("./on-alert-created.js");

    await capturedHandler({
      params: { alertId: "a1" },
      data: undefined,
    });

    expect(mockSendEachForMulticast).not.toHaveBeenCalled();
  });

  it("should send FCM to responders with valid tokens", async () => {
    // Mock responders query
    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [
        { id: "g1_r1", data: () => ({ uid: "r1", fcmToken: "token-1", displayName: "Resp1" }) },
        { id: "g1_r2", data: () => ({ uid: "r2", fcmToken: "token-2", displayName: "Resp2" }) },
        { id: "g1_r3", data: () => ({ uid: "r3", fcmToken: null, displayName: "Resp3" }) },
      ],
    });

    // Mock alerter member query
    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [{ data: () => ({ displayName: "Alerter1" }) }],
    });

    mockSendEachForMulticast.mockResolvedValueOnce({
      successCount: 2,
      failureCount: 0,
      responses: [
        { success: true },
        { success: true },
      ],
    });

    await import("./on-alert-created.js");

    await capturedHandler({
      params: { alertId: "a1" },
      data: {
        data: () => ({ status: "active", groupId: "g1", triggeredBy: "u1" }),
      },
    });

    expect(mockSendEachForMulticast).toHaveBeenCalledWith({
      tokens: ["token-1", "token-2"],
      data: {
        alertId: "a1",
        groupId: "g1",
        alerterName: "Alerter1",
        type: "new_alert",
      },
      android: {
        priority: "high",
        ttl: 60000,
      },
    });
  });

  it("should not send FCM if no tokens available", async () => {
    // All responders have null tokens
    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [
        { id: "g1_r1", data: () => ({ uid: "r1", fcmToken: null, displayName: "Resp1" }) },
      ],
    });

    // Mock alerter member query
    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [{ data: () => ({ displayName: "Alerter1" }) }],
    });

    await import("./on-alert-created.js");

    await capturedHandler({
      params: { alertId: "a1" },
      data: {
        data: () => ({ status: "active", groupId: "g1", triggeredBy: "u1" }),
      },
    });

    expect(mockSendEachForMulticast).not.toHaveBeenCalled();
  });

  it("should clean up invalid tokens on send failure", async () => {
    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [
        { id: "g1_r1", data: () => ({ uid: "r1", fcmToken: "token-bad", displayName: "Resp1" }) },
        { id: "g1_r2", data: () => ({ uid: "r2", fcmToken: "token-good", displayName: "Resp2" }) },
      ],
    });

    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [{ data: () => ({ displayName: "Alerter1" }) }],
    });

    mockSendEachForMulticast.mockResolvedValueOnce({
      successCount: 1,
      failureCount: 1,
      responses: [
        { success: false, error: { code: "messaging/registration-token-not-registered" } },
        { success: true },
      ],
    });

    await import("./on-alert-created.js");

    await capturedHandler({
      params: { alertId: "a1" },
      data: {
        data: () => ({ status: "active", groupId: "g1", triggeredBy: "u1" }),
      },
    });

    expect(mockDoc).toHaveBeenCalledWith("g1_r1");
    expect(mockUpdate).toHaveBeenCalledWith({ fcmToken: null });
  });

  it("should use 'Unknown' as alerter name if no member found", async () => {
    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [
        { id: "g1_r1", data: () => ({ uid: "r1", fcmToken: "token-1", displayName: "Resp1" }) },
      ],
    });

    // Alerter not found
    mockGet.mockResolvedValueOnce({ empty: true, docs: [] });

    mockSendEachForMulticast.mockResolvedValueOnce({
      successCount: 1,
      failureCount: 0,
      responses: [{ success: true }],
    });

    await import("./on-alert-created.js");

    await capturedHandler({
      params: { alertId: "a1" },
      data: {
        data: () => ({ status: "active", groupId: "g1", triggeredBy: "u1" }),
      },
    });

    expect(mockSendEachForMulticast).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ alerterName: "Unknown" }),
      }),
    );
  });
});
