import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import type { Timestamp } from "firebase-admin/firestore";

const fakeServerTimestamp = { _methodName: "serverTimestamp" };
const mockUpdate = vi.fn().mockResolvedValue(undefined);
const mockDocGet = vi.fn();
const mockGet = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockCollection = vi.fn();
const mockDoc = vi.fn();

vi.mock("firebase-admin/firestore", () => ({
  getFirestore: () => ({
    collection: mockCollection,
  }),
  FieldValue: {
    serverTimestamp: () => fakeServerTimestamp,
  },
  Timestamp: {
    now: () => ({ seconds: 1000, nanoseconds: 0 }),
  },
}));

vi.mock("firebase-admin/app", () => ({
  initializeApp: vi.fn(),
  getApps: () => [{}],
}));

let capturedHandler: (request: unknown) => Promise<unknown>;

vi.mock("firebase-functions/v2/https", () => ({
  onCall: (_opts: Record<string, unknown>, handler: (request: unknown) => Promise<unknown>) => {
    capturedHandler = handler;
    return handler;
  },
  HttpsError: class HttpsError extends Error {
    constructor(public code: string, message: string) {
      super(message);
    }
  },
}));

describe("updateMemberZone callable", () => {
  beforeAll(async () => {
    await import("./update-member-zone.js");
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mockDoc.mockReturnValue({ get: mockDocGet, update: mockUpdate });
    mockLimit.mockReturnValue({ get: mockGet });
    mockWhere.mockReturnValue({ where: mockWhere, limit: mockLimit, get: mockGet });
    mockCollection.mockReturnValue({ where: mockWhere, doc: mockDoc });
  });

  it("should throw unauthenticated if no auth", async () => {
    await expect(
      capturedHandler({ auth: null, data: {} })
    ).rejects.toThrow("Authentication required");
  });

  it("should throw permission-denied if not group member", async () => {
    mockDocGet.mockResolvedValue({ exists: false });
    mockCollection.mockImplementation((col: string) => {
      if (col === "groupMembers") return { doc: () => ({ get: mockDocGet, update: mockUpdate }) };
      return { where: mockWhere, doc: mockDoc };
    });

    await expect(
      capturedHandler({ auth: { uid: "u1" }, data: { groupId: "g1", zone: "Kitchen" } })
    ).rejects.toThrow("You are not a member of this group");
  });

  it("should update zone for group member without rate-limit issue", async () => {
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({ currentZone: null, currentZoneUpdatedAt: null }),
    });
    mockCollection.mockImplementation((col: string) => {
      if (col === "groupMembers") return { doc: () => ({ get: mockDocGet, update: mockUpdate }) };
      return { where: mockWhere, doc: mockDoc };
    });

    const result = await capturedHandler({
      auth: { uid: "u1" },
      data: { groupId: "g1", zone: "Kitchen" },
    });

    expect(mockUpdate).toHaveBeenCalledWith({
      currentZone: "Kitchen",
      currentZoneUpdatedAt: fakeServerTimestamp,
    });
    expect(result).toEqual({ zone: "Kitchen" });
  });

  it("should throw resource-exhausted if rate-limited", async () => {
    const recentTimestamp = { toMillis: () => Date.now() - 5_000 } as unknown as Timestamp;
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({ currentZone: "Bedroom", currentZoneUpdatedAt: recentTimestamp }),
    });
    mockCollection.mockImplementation((col: string) => {
      if (col === "groupMembers") return { doc: () => ({ get: mockDocGet, update: mockUpdate }) };
      return { where: mockWhere, doc: mockDoc };
    });

    await expect(
      capturedHandler({ auth: { uid: "u1" }, data: { groupId: "g1", zone: "Kitchen" } })
    ).rejects.toThrow(/Rate limit/);
  });

  it("should reject invalid beaconId not in group", async () => {
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({ currentZone: null, currentZoneUpdatedAt: null }),
    });
    mockGet.mockResolvedValue({ empty: true });
    mockCollection.mockImplementation((col: string) => {
      if (col === "groupMembers") return { doc: () => ({ get: mockDocGet, update: mockUpdate }) };
      if (col === "beacons") return { where: mockWhere };
      return { where: mockWhere, doc: mockDoc };
    });

    await expect(
      capturedHandler({
        auth: { uid: "u1" },
        data: { groupId: "g1", zone: "Kitchen", beaconId: "invalid-uuid" },
      })
    ).rejects.toThrow("Beacon not found");
  });
});
