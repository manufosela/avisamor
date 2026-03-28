import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Timestamp } from "firebase-admin/firestore";

const fakeTimestamp = { seconds: 1000, nanoseconds: 0 } as unknown as Timestamp;
const fakeServerTimestamp = { _methodName: "serverTimestamp" };

const mockSet = vi.fn().mockResolvedValue(undefined);
const mockUpdate = vi.fn().mockResolvedValue(undefined);
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

mockDoc.mockReturnValue({ set: mockSet, update: mockUpdate, id: "alert-1" });
mockWhere.mockReturnValue({ where: mockWhere, limit: mockLimit, get: mockGet });
mockLimit.mockReturnValue({ get: mockGet });
mockCollection.mockReturnValue({ where: mockWhere, doc: mockDoc });

vi.mock("firebase-admin/firestore", () => ({
  getFirestore: () => mockDb,
  FieldValue: {
    serverTimestamp: () => fakeServerTimestamp,
    arrayUnion: (...args: unknown[]) => ({ _methodName: "arrayUnion", args }),
  },
  Timestamp: {
    now: () => fakeTimestamp,
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

describe("acceptAlert callable", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    mockCollection.mockReturnValue({ where: mockWhere, doc: mockDoc });
    mockWhere.mockReturnValue({ where: mockWhere, limit: mockLimit, get: mockGet });
    mockLimit.mockReturnValue({ get: mockGet });
    mockDoc.mockReturnValue({ set: mockSet, update: mockUpdate, id: "alert-1" });
  });

  it("should throw unauthenticated if no auth", async () => {
    await import("./accept-alert.js");
    await expect(capturedHandler({ auth: null, data: { alertId: "a1" } }))
      .rejects.toThrow("Authentication required");
  });

  it("should throw invalid-argument if alertId is missing", async () => {
    await import("./accept-alert.js");
    await expect(capturedHandler({ auth: { uid: "u1" }, data: {} }))
      .rejects.toThrow("alertId is required");
  });

  it("should throw not-found if alert does not exist", async () => {
    mockRunTransaction.mockImplementation(async (fn: (t: unknown) => Promise<unknown>) => {
      return fn({
        get: vi.fn().mockResolvedValue({ exists: false }),
        update: vi.fn(),
      });
    });

    await import("./accept-alert.js");
    await expect(
      capturedHandler({ auth: { uid: "u1", token: { name: "User" } }, data: { alertId: "a1" } }),
    ).rejects.toThrow("Alert not found");
  });

  it("should throw failed-precondition if alert is not active or accepted", async () => {
    mockRunTransaction.mockImplementation(async (fn: (t: unknown) => Promise<unknown>) => {
      return fn({
        get: vi.fn().mockImplementation((ref: unknown) => {
          // First call: alert doc
          return Promise.resolve({
            exists: true,
            data: () => ({ status: "resolved", groupId: "g1", acceptedBy: [] }),
          });
        }),
        update: vi.fn(),
      });
    });

    await import("./accept-alert.js");
    await expect(
      capturedHandler({ auth: { uid: "u1", token: { name: "User" } }, data: { alertId: "a1" } }),
    ).rejects.toThrow();
  });

  it("should accept alert and return isFirst=true on first acceptance", async () => {
    // groupMembers query: user is responder
    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [{ data: () => ({ role: "responder", uid: "u1", groupId: "g1", displayName: "User1" }) }],
    });

    mockRunTransaction.mockImplementation(async (fn: (t: unknown) => Promise<unknown>) => {
      const txUpdate = vi.fn();
      return fn({
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ status: "active", groupId: "g1", acceptedBy: [] }),
        }),
        update: txUpdate,
      });
    });

    await import("./accept-alert.js");
    const result = await capturedHandler({
      auth: { uid: "u1", token: { name: "User1" } },
      data: { alertId: "a1" },
    });

    expect(result).toEqual({ status: "accepted", isFirst: true });
  });

  it("should accept alert and return isFirst=false if already accepted by others", async () => {
    // groupMembers query: user is responder
    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [{ data: () => ({ role: "responder", uid: "u2", groupId: "g1", displayName: "User2" }) }],
    });

    mockRunTransaction.mockImplementation(async (fn: (t: unknown) => Promise<unknown>) => {
      const txUpdate = vi.fn();
      return fn({
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            status: "accepted",
            groupId: "g1",
            acceptedBy: [{ uid: "u1", displayName: "User1", acceptedAt: fakeTimestamp }],
            firstAcceptedBy: "u1",
            firstAcceptedAt: fakeTimestamp,
          }),
        }),
        update: txUpdate,
      });
    });

    await import("./accept-alert.js");
    const result = await capturedHandler({
      auth: { uid: "u2", token: { name: "User2" } },
      data: { alertId: "a1" },
    });

    expect(result).toEqual({ status: "accepted", isFirst: false });
  });
});
