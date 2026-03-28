import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Timestamp } from "firebase-admin/firestore";

const fakeTimestamp = { seconds: 1000, nanoseconds: 0 } as unknown as Timestamp;
const fakeServerTimestamp = { _methodName: "serverTimestamp" };

const mockSet = vi.fn().mockResolvedValue(undefined);
const mockGet = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockDoc = vi.fn();
const mockCollection = vi.fn();
const mockRunTransaction = vi.fn();

const mockDb = {
  collection: mockCollection,
  runTransaction: mockRunTransaction,
};

mockDoc.mockReturnValue({ set: mockSet, id: "alert-id-456" });
mockWhere.mockReturnValue({ where: mockWhere, limit: mockLimit, get: mockGet });
mockLimit.mockReturnValue({ get: mockGet });
mockCollection.mockReturnValue({ where: mockWhere, doc: mockDoc });

vi.mock("firebase-admin/firestore", () => ({
  getFirestore: () => mockDb,
  FieldValue: { serverTimestamp: () => fakeServerTimestamp },
  Timestamp: {
    now: () => fakeTimestamp,
    fromMillis: (ms: number) => ({ seconds: Math.floor(ms / 1000), nanoseconds: 0 }),
  },
}));

vi.mock("firebase-admin/app", () => ({
  initializeApp: vi.fn(),
  getApps: () => [{}],
}));

let capturedHandler: (request: unknown) => Promise<unknown>;

vi.mock("firebase-functions/v2/https", () => ({
  onCall: (opts: Record<string, unknown>, handler: (request: unknown) => Promise<unknown>) => {
    capturedHandler = handler;
    return handler;
  },
  HttpsError: class HttpsError extends Error {
    constructor(public code: string, public message: string) {
      super(message);
    }
  },
}));

describe("createAlert callable", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    mockCollection.mockReturnValue({ where: mockWhere, doc: mockDoc });
    mockWhere.mockReturnValue({ where: mockWhere, limit: mockLimit, get: mockGet });
    mockLimit.mockReturnValue({ get: mockGet });
    mockDoc.mockReturnValue({ set: mockSet, id: "alert-id-456" });
  });

  it("should throw unauthenticated if no auth", async () => {
    await import("./create-alert.js");
    await expect(capturedHandler({ auth: null, data: { groupId: "g1" } }))
      .rejects.toThrow("Authentication required");
  });

  it("should throw invalid-argument if groupId is missing", async () => {
    await import("./create-alert.js");
    await expect(capturedHandler({ auth: { uid: "u1" }, data: {} }))
      .rejects.toThrow("groupId is required");
  });

  it("should throw permission-denied if user is not alerter in group", async () => {
    // groupMembers query returns empty (not a member)
    mockGet.mockResolvedValueOnce({ empty: true });

    await import("./create-alert.js");
    await expect(
      capturedHandler({ auth: { uid: "u1" }, data: { groupId: "g1" } }),
    ).rejects.toThrow();
  });

  it("should return alertId on success", async () => {
    // groupMembers query: user is alerter
    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [{ data: () => ({ role: "alerter", uid: "u1", groupId: "g1" }) }],
    });

    // Transaction: no active alerts (debounce passes), create alert
    mockRunTransaction.mockImplementation(async (fn: (t: unknown) => Promise<unknown>) => {
      return fn({
        get: vi.fn().mockResolvedValue({ empty: true }),
        set: vi.fn(),
      });
    });

    await import("./create-alert.js");
    const result = await capturedHandler({
      auth: { uid: "u1", token: {} },
      data: { groupId: "g1" },
    });

    expect(result).toHaveProperty("alertId");
  });

  it("should throw resource-exhausted if debounce detects recent alert", async () => {
    // groupMembers query: user is alerter
    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [{ data: () => ({ role: "alerter", uid: "u1", groupId: "g1" }) }],
    });

    // Transaction: active alert found (debounce)
    mockRunTransaction.mockImplementation(async (fn: (t: unknown) => Promise<unknown>) => {
      return fn({
        get: vi.fn().mockResolvedValue({ empty: false }),
        set: vi.fn(),
      });
    });

    await import("./create-alert.js");
    await expect(
      capturedHandler({ auth: { uid: "u1", token: {} }, data: { groupId: "g1" } }),
    ).rejects.toThrow();
  });
});
