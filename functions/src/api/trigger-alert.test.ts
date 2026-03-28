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

mockDoc.mockReturnValue({ set: mockSet, id: "alert-id-123" });
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

const mockCompare = vi.fn();
vi.mock("bcryptjs", () => ({
  compare: mockCompare,
}));

let capturedHandler: (req: unknown, res: unknown) => Promise<void>;

vi.mock("firebase-functions/v2/https", () => ({
  onRequest: (opts: unknown, handler: (req: unknown, res: unknown) => Promise<void>) => {
    capturedHandler = handler;
    return handler;
  },
  HttpsError: class HttpsError extends Error {
    constructor(public code: string, public message: string) {
      super(message);
    }
  },
}));

function makeRes() {
  const res: Record<string, unknown> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("triggerAlert HTTP endpoint", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    mockCollection.mockReturnValue({ where: mockWhere, doc: mockDoc });
    mockWhere.mockReturnValue({ where: mockWhere, limit: mockLimit, get: mockGet });
    mockLimit.mockReturnValue({ get: mockGet });
    mockDoc.mockReturnValue({ set: mockSet, id: "alert-id-123" });
  });

  it("should return 401 if x-api-key header is missing", async () => {
    await import("./trigger-alert.js");
    const res = makeRes();
    await capturedHandler({ headers: {}, method: "POST" }, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("should return 401 if api key is not found", async () => {
    await import("./trigger-alert.js");
    mockGet.mockResolvedValueOnce({ empty: true });
    const res = makeRes();
    await capturedHandler(
      { headers: { "x-api-key": "invalid-key" }, method: "POST" },
      res,
    );
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("should return 401 if api key hash does not match", async () => {
    mockCompare.mockResolvedValue(false);
    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [{ data: () => ({ keyHash: "hashed", groupId: "g1", active: true }) }],
    });

    await import("./trigger-alert.js");
    const res = makeRes();
    await capturedHandler(
      { headers: { "x-api-key": "wrong-key" }, method: "POST" },
      res,
    );
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("should return 429 if debounce detects recent active alert", async () => {
    mockCompare.mockResolvedValue(true);

    // apiKeys query
    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [{ data: () => ({ keyHash: "hashed", groupId: "g1", active: true }) }],
    });

    // Transaction: debounce finds active alert
    mockRunTransaction.mockImplementation(async (fn: (t: unknown) => Promise<unknown>) => {
      return fn({
        get: vi.fn().mockResolvedValue({ empty: false }),
        set: vi.fn(),
      });
    });

    await import("./trigger-alert.js");
    const res = makeRes();
    await capturedHandler(
      { headers: { "x-api-key": "valid-key" }, method: "POST" },
      res,
    );
    expect(res.status).toHaveBeenCalledWith(429);
  });

  it("should return 200 with alertId on success", async () => {
    mockCompare.mockResolvedValue(true);

    // apiKeys query
    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [{ data: () => ({ keyHash: "hashed", groupId: "g1", active: true }) }],
    });

    // Transaction: no active alerts, create succeeds
    mockRunTransaction.mockImplementation(async (fn: (t: unknown) => Promise<unknown>) => {
      return fn({
        get: vi.fn().mockResolvedValue({ empty: true }),
        set: vi.fn(),
      });
    });

    await import("./trigger-alert.js");
    const res = makeRes();
    await capturedHandler(
      { headers: { "x-api-key": "valid-key" }, method: "POST" },
      res,
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ alertId: expect.any(String) }));
  });

  it("should only accept POST method", async () => {
    await import("./trigger-alert.js");
    const res = makeRes();
    await capturedHandler({ headers: { "x-api-key": "key" }, method: "GET" }, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });
});
