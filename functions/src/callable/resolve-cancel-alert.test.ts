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
  FieldValue: { serverTimestamp: () => fakeServerTimestamp },
  Timestamp: { now: () => fakeTimestamp },
}));

vi.mock("firebase-admin/app", () => ({
  initializeApp: vi.fn(),
  getApps: () => [{}],
}));

const capturedHandlers: Record<string, (request: unknown) => Promise<unknown>> = {};

vi.mock("firebase-functions/v2/https", () => ({
  onCall: (opts: Record<string, unknown>, handler: (request: unknown) => Promise<unknown>) => {
    // Store by the call order so we can retrieve them
    const keys = Object.keys(capturedHandlers);
    const name = keys.length === 0 ? "resolveAlert" : "cancelAlert";
    capturedHandlers[name] = handler;
    return handler;
  },
  HttpsError: class HttpsError extends Error {
    constructor(public code: string, public message: string) {
      super(message);
    }
  },
}));

describe("resolveAlert callable", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    // Clear handlers
    for (const key of Object.keys(capturedHandlers)) delete capturedHandlers[key];
    mockCollection.mockReturnValue({ where: mockWhere, doc: mockDoc });
    mockWhere.mockReturnValue({ where: mockWhere, limit: mockLimit, get: mockGet });
    mockLimit.mockReturnValue({ get: mockGet });
    mockDoc.mockReturnValue({ set: mockSet, update: mockUpdate, id: "alert-1" });
  });

  it("should throw unauthenticated if no auth", async () => {
    await import("./resolve-cancel-alert.js");
    await expect(capturedHandlers.resolveAlert({ auth: null, data: { alertId: "a1" } }))
      .rejects.toThrow("Authentication required");
  });

  it("should throw not-found if alert does not exist", async () => {
    mockRunTransaction.mockImplementation(async (fn: (t: unknown) => Promise<unknown>) => {
      return fn({
        get: vi.fn().mockResolvedValue({ exists: false }),
        update: vi.fn(),
        set: vi.fn(),
      });
    });

    await import("./resolve-cancel-alert.js");
    await expect(
      capturedHandlers.resolveAlert({ auth: { uid: "u1" }, data: { alertId: "a1" } }),
    ).rejects.toThrow("Alert not found");
  });

  it("should throw failed-precondition if alert is not accepted", async () => {
    mockRunTransaction.mockImplementation(async (fn: (t: unknown) => Promise<unknown>) => {
      return fn({
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ status: "active", groupId: "g1" }),
          ref: mockDoc(),
        }),
        update: vi.fn(),
        set: vi.fn(),
      });
    });

    await import("./resolve-cancel-alert.js");
    await expect(
      capturedHandlers.resolveAlert({ auth: { uid: "u1" }, data: { alertId: "a1" } }),
    ).rejects.toThrow();
  });

  it("should resolve an accepted alert and archive it", async () => {
    const alertData = {
      status: "accepted",
      groupId: "g1",
      alertId: "a1",
      acceptedBy: [{ uid: "u1" }],
    };
    const txUpdate = vi.fn();
    const txSet = vi.fn();

    mockRunTransaction.mockImplementation(async (fn: (t: unknown) => Promise<unknown>) => {
      return fn({
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => alertData,
          ref: { id: "a1", path: "alerts/a1" },
        }),
        update: txUpdate,
        set: txSet,
      });
    });

    await import("./resolve-cancel-alert.js");
    const result = await capturedHandlers.resolveAlert({
      auth: { uid: "u1" },
      data: { alertId: "a1" },
    });

    expect(result).toHaveProperty("status", "resolved");
    expect(txUpdate).toHaveBeenCalled();
    expect(txSet).toHaveBeenCalled(); // alertHistory
  });
});

describe("cancelAlert callable", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    for (const key of Object.keys(capturedHandlers)) delete capturedHandlers[key];
    mockCollection.mockReturnValue({ where: mockWhere, doc: mockDoc });
    mockWhere.mockReturnValue({ where: mockWhere, limit: mockLimit, get: mockGet });
    mockLimit.mockReturnValue({ get: mockGet });
    mockDoc.mockReturnValue({ set: mockSet, update: mockUpdate, id: "alert-1" });
  });

  it("should throw unauthenticated if no auth", async () => {
    await import("./resolve-cancel-alert.js");
    await expect(capturedHandlers.cancelAlert({ auth: null, data: { alertId: "a1" } }))
      .rejects.toThrow("Authentication required");
  });

  it("should throw failed-precondition if alert is not active", async () => {
    mockRunTransaction.mockImplementation(async (fn: (t: unknown) => Promise<unknown>) => {
      return fn({
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ status: "resolved", groupId: "g1", triggeredBy: "u1" }),
          ref: mockDoc(),
        }),
        update: vi.fn(),
        set: vi.fn(),
      });
    });

    await import("./resolve-cancel-alert.js");
    await expect(
      capturedHandlers.cancelAlert({ auth: { uid: "u1" }, data: { alertId: "a1" } }),
    ).rejects.toThrow();
  });

  it("should throw permission-denied if user is not the alerter", async () => {
    mockRunTransaction.mockImplementation(async (fn: (t: unknown) => Promise<unknown>) => {
      return fn({
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ status: "active", groupId: "g1", triggeredBy: "other-user" }),
          ref: mockDoc(),
        }),
        update: vi.fn(),
        set: vi.fn(),
      });
    });

    await import("./resolve-cancel-alert.js");
    await expect(
      capturedHandlers.cancelAlert({ auth: { uid: "u1" }, data: { alertId: "a1" } }),
    ).rejects.toThrow();
  });

  it("should cancel an active alert and archive it", async () => {
    const alertData = {
      status: "active",
      groupId: "g1",
      alertId: "a1",
      triggeredBy: "u1",
    };
    const txUpdate = vi.fn();
    const txSet = vi.fn();

    mockRunTransaction.mockImplementation(async (fn: (t: unknown) => Promise<unknown>) => {
      return fn({
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => alertData,
          ref: { id: "a1", path: "alerts/a1" },
        }),
        update: txUpdate,
        set: txSet,
      });
    });

    await import("./resolve-cancel-alert.js");
    const result = await capturedHandlers.cancelAlert({
      auth: { uid: "u1" },
      data: { alertId: "a1" },
    });

    expect(result).toHaveProperty("status", "cancelled");
    expect(txUpdate).toHaveBeenCalled();
    expect(txSet).toHaveBeenCalled();
  });
});
