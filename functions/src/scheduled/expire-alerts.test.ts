import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Timestamp } from "firebase-admin/firestore";

const fakeNow = { seconds: 1000, nanoseconds: 0, toMillis: () => 1000000 } as unknown as Timestamp;
const fakeServerTimestamp = { _methodName: "serverTimestamp" };

const mockGet = vi.fn();
const mockWhere = vi.fn();
const mockDoc = vi.fn();
const mockCollection = vi.fn();
const mockUpdate = vi.fn().mockResolvedValue(undefined);
const mockSet = vi.fn().mockResolvedValue(undefined);

const mockDb = {
  collection: mockCollection,
};

mockDoc.mockReturnValue({ update: mockUpdate, set: mockSet });
mockWhere.mockReturnValue({ where: mockWhere, get: mockGet });
mockCollection.mockReturnValue({ where: mockWhere, doc: mockDoc });

vi.mock("firebase-admin/firestore", () => ({
  getFirestore: () => mockDb,
  FieldValue: {
    serverTimestamp: () => fakeServerTimestamp,
  },
  Timestamp: {
    now: () => fakeNow,
  },
}));

vi.mock("firebase-admin/app", () => ({
  initializeApp: vi.fn(),
  getApps: () => [{}],
}));

let capturedHandler: (event: unknown) => Promise<void>;

vi.mock("firebase-functions/v2/scheduler", () => ({
  onSchedule: (opts: unknown, handler: (event: unknown) => Promise<void>) => {
    capturedHandler = handler;
    return handler;
  },
}));

describe("expireAlerts scheduler", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    mockCollection.mockReturnValue({ where: mockWhere, doc: mockDoc });
    mockWhere.mockReturnValue({ where: mockWhere, get: mockGet });
    mockDoc.mockReturnValue({ update: mockUpdate, set: mockSet });
  });

  it("should do nothing if no expired alerts found", async () => {
    mockGet.mockResolvedValueOnce({ empty: true, docs: [] });

    await import("./expire-alerts.js");

    await capturedHandler({});

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("should expire active alerts past expiresAt and archive them", async () => {
    const alertData = {
      alertId: "a1",
      groupId: "g1",
      status: "active",
      triggeredBy: "u1",
      expiresAt: { seconds: 500, nanoseconds: 0 },
    };

    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          id: "a1",
          ref: { update: mockUpdate },
          data: () => alertData,
        },
      ],
    });

    await import("./expire-alerts.js");

    await capturedHandler({});

    expect(mockUpdate).toHaveBeenCalledWith({ status: "expired" });
    expect(mockSet).toHaveBeenCalledWith({
      ...alertData,
      status: "expired",
      archivedAt: fakeServerTimestamp,
    });
  });

  it("should expire multiple alerts", async () => {
    const alert1 = { alertId: "a1", groupId: "g1", status: "active" };
    const alert2 = { alertId: "a2", groupId: "g2", status: "active" };
    const mockUpdate1 = vi.fn().mockResolvedValue(undefined);
    const mockUpdate2 = vi.fn().mockResolvedValue(undefined);

    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [
        { id: "a1", ref: { update: mockUpdate1 }, data: () => alert1 },
        { id: "a2", ref: { update: mockUpdate2 }, data: () => alert2 },
      ],
    });

    await import("./expire-alerts.js");

    await capturedHandler({});

    expect(mockUpdate1).toHaveBeenCalledWith({ status: "expired" });
    expect(mockUpdate2).toHaveBeenCalledWith({ status: "expired" });
    // 2 archives
    expect(mockSet).toHaveBeenCalledTimes(2);
  });
});
