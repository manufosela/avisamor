import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Timestamp } from "firebase-admin/firestore";

const fakeTimestamp = { seconds: 1000, nanoseconds: 0 } as unknown as Timestamp;

const mockGet = vi.fn();
const mockWhere = vi.fn();
const mockDoc = vi.fn();
const mockCollection = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();
const mockStartAfter = vi.fn();

const mockDb = {
  collection: mockCollection,
};

mockDoc.mockReturnValue({ get: mockGet });
mockWhere.mockReturnValue({ where: mockWhere, get: mockGet, orderBy: mockOrderBy });
mockOrderBy.mockReturnValue({ limit: mockLimit, startAfter: mockStartAfter });
mockLimit.mockReturnValue({ get: mockGet, startAfter: mockStartAfter });
mockStartAfter.mockReturnValue({ limit: mockLimit, get: mockGet });
mockCollection.mockReturnValue({ where: mockWhere, doc: mockDoc, orderBy: mockOrderBy });

vi.mock("firebase-admin/firestore", () => ({
  getFirestore: () => mockDb,
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

describe("getHistory callable", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    mockCollection.mockReturnValue({ where: mockWhere, doc: mockDoc, orderBy: mockOrderBy });
    mockWhere.mockReturnValue({ where: mockWhere, get: mockGet, orderBy: mockOrderBy });
    mockOrderBy.mockReturnValue({ limit: mockLimit, startAfter: mockStartAfter });
    mockLimit.mockReturnValue({ get: mockGet, startAfter: mockStartAfter });
    mockStartAfter.mockReturnValue({ limit: mockLimit, get: mockGet });
    mockDoc.mockReturnValue({ get: mockGet });
  });

  it("should throw unauthenticated if no auth", async () => {
    await import("./get-history.js");
    await expect(capturedHandler({ auth: null, data: { groupId: "g1" } }))
      .rejects.toThrow("Authentication required");
  });

  it("should throw invalid-argument if groupId missing", async () => {
    await import("./get-history.js");
    await expect(capturedHandler({ auth: { uid: "u1" }, data: {} }))
      .rejects.toThrow("groupId is required");
  });

  it("should throw permission-denied if user is not member of group", async () => {
    mockGet.mockResolvedValueOnce({ exists: false });

    await import("./get-history.js");
    await expect(capturedHandler({ auth: { uid: "u1" }, data: { groupId: "g1" } }))
      .rejects.toThrow("Not a member of this group");
  });

  it("should return alert history ordered by createdAt desc", async () => {
    // Member check
    mockGet.mockResolvedValueOnce({ exists: true });

    const alertHistoryData = {
      alertId: "a1",
      groupId: "g1",
      status: "resolved",
      createdAt: fakeTimestamp,
      archivedAt: fakeTimestamp,
    };

    // History query
    mockGet.mockResolvedValueOnce({
      docs: [
        { id: "a1", data: () => alertHistoryData },
      ],
    });

    await import("./get-history.js");
    const result = await capturedHandler({
      auth: { uid: "u1" },
      data: { groupId: "g1" },
    });

    expect(result).toEqual({
      alerts: [alertHistoryData],
      hasMore: false,
    });
  });

  it("should respect limit parameter, capped at 100", async () => {
    // Member check
    mockGet.mockResolvedValueOnce({ exists: true });

    // History query
    mockGet.mockResolvedValueOnce({ docs: [] });

    await import("./get-history.js");
    await capturedHandler({
      auth: { uid: "u1" },
      data: { groupId: "g1", limit: 200 },
    });

    // Should cap to 100 + 1 (for hasMore check)
    expect(mockLimit).toHaveBeenCalledWith(101);
  });

  it("should set hasMore=true when more results available", async () => {
    // Member check
    mockGet.mockResolvedValueOnce({ exists: true });

    // Return 51 docs (limit 50 + 1)
    const docs = Array.from({ length: 51 }, (_, i) => ({
      id: `a${i}`,
      data: () => ({ alertId: `a${i}`, groupId: "g1", createdAt: fakeTimestamp }),
    }));

    mockGet.mockResolvedValueOnce({ docs });

    await import("./get-history.js");
    const result = await capturedHandler({
      auth: { uid: "u1" },
      data: { groupId: "g1" },
    }) as { alerts: unknown[]; hasMore: boolean };

    expect(result.hasMore).toBe(true);
    expect(result.alerts).toHaveLength(50);
  });

  it("should support pagination with startAfter", async () => {
    // Member check
    mockGet.mockResolvedValueOnce({ exists: true });

    // startAfter doc
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ createdAt: fakeTimestamp }),
    });

    // History query
    mockGet.mockResolvedValueOnce({ docs: [] });

    await import("./get-history.js");
    await capturedHandler({
      auth: { uid: "u1" },
      data: { groupId: "g1", startAfter: "cursor-alert-id" },
    });

    expect(mockStartAfter).toHaveBeenCalled();
  });
});
