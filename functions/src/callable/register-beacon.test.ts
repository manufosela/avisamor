import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

const fakeServerTimestamp = { _methodName: "serverTimestamp" };

const mockSet = vi.fn().mockResolvedValue(undefined);
const mockGet = vi.fn();
const mockDocGet = vi.fn();
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
}));

vi.mock("firebase-admin/app", () => ({
  initializeApp: vi.fn(),
  getApps: () => [{}],
}));

let capturedRegisterHandler: (request: unknown) => Promise<unknown>;
let capturedListHandler: (request: unknown) => Promise<unknown>;
let handlerIndex = 0;

vi.mock("firebase-functions/v2/https", () => ({
  onCall: (_opts: Record<string, unknown>, handler: (request: unknown) => Promise<unknown>) => {
    if (handlerIndex === 0) {
      capturedRegisterHandler = handler;
    } else {
      capturedListHandler = handler;
    }
    handlerIndex++;
    return handler;
  },
  HttpsError: class HttpsError extends Error {
    constructor(public code: string, message: string) {
      super(message);
    }
  },
}));

beforeAll(async () => {
  await import("./register-beacon.js");
});

describe("registerBeacon callable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDoc.mockReturnValue({ set: mockSet, id: "beacon-doc-id", get: mockDocGet });
    mockLimit.mockReturnValue({ get: mockGet });
    mockWhere.mockReturnValue({ where: mockWhere, limit: mockLimit, get: mockGet });
    mockCollection.mockReturnValue({ where: mockWhere, doc: mockDoc });
  });

  it("should throw unauthenticated if no auth", async () => {
    await expect(
      capturedRegisterHandler({ auth: null, data: {} })
    ).rejects.toThrow("Authentication required");
  });

  it("should throw invalid-argument if groupId missing", async () => {
    await expect(
      capturedRegisterHandler({ auth: { uid: "u1" }, data: { beaconId: "uuid1", zoneName: "Kitchen", floor: 0 } })
    ).rejects.toThrow("groupId is required");
  });

  it("should throw permission-denied if not group creator", async () => {
    mockDocGet.mockResolvedValue({ exists: true, data: () => ({ createdBy: "other-user" }) });
    mockCollection.mockImplementation((col: string) => {
      if (col === "groups") return { doc: () => ({ get: mockDocGet }) };
      return { where: mockWhere, doc: mockDoc };
    });

    await expect(
      capturedRegisterHandler({
        auth: { uid: "u1" },
        data: { groupId: "g1", beaconId: "uuid1", zoneName: "Kitchen", floor: 0 },
      })
    ).rejects.toThrow("Only the group creator can register beacons");
  });

  it("should create beacon document for group creator", async () => {
    mockDocGet.mockResolvedValue({ exists: true, data: () => ({ createdBy: "u1" }) });
    mockGet.mockResolvedValue({ empty: true });
    mockCollection.mockImplementation((col: string) => {
      if (col === "groups") return { doc: () => ({ get: mockDocGet }) };
      if (col === "beacons") return { where: mockWhere, doc: () => ({ set: mockSet, id: "beacon-doc-id" }) };
      return { where: mockWhere, doc: mockDoc };
    });

    const result = await capturedRegisterHandler({
      auth: { uid: "u1" },
      data: { groupId: "g1", beaconId: "uuid1", zoneName: "Kitchen", floor: 0 },
    });

    expect(mockSet).toHaveBeenCalled();
    expect(result).toEqual({ id: "beacon-doc-id", beaconId: "uuid1", zoneName: "Kitchen", floor: 0 });
  });

  it("should throw already-exists if beacon already registered", async () => {
    mockDocGet.mockResolvedValue({ exists: true, data: () => ({ createdBy: "u1" }) });
    mockGet.mockResolvedValue({ empty: false });
    mockCollection.mockImplementation((col: string) => {
      if (col === "groups") return { doc: () => ({ get: mockDocGet }) };
      if (col === "beacons") return { where: mockWhere };
      return { where: mockWhere, doc: mockDoc };
    });

    await expect(
      capturedRegisterHandler({
        auth: { uid: "u1" },
        data: { groupId: "g1", beaconId: "uuid1", zoneName: "Kitchen", floor: 0 },
      })
    ).rejects.toThrow("Beacon already registered");
  });
});

describe("listBeacons callable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDoc.mockReturnValue({ set: mockSet, id: "doc-id", get: mockDocGet });
    mockLimit.mockReturnValue({ get: mockGet });
    mockWhere.mockReturnValue({ where: mockWhere, limit: mockLimit, get: mockGet });
    mockCollection.mockReturnValue({ where: mockWhere, doc: mockDoc });
  });

  it("should throw unauthenticated if no auth", async () => {
    await expect(
      capturedListHandler({ auth: null, data: {} })
    ).rejects.toThrow("Authentication required");
  });

  it("should throw permission-denied if not group member", async () => {
    mockDocGet.mockResolvedValue({ exists: false });
    mockCollection.mockImplementation((col: string) => {
      if (col === "groupMembers") return { doc: () => ({ get: mockDocGet }) };
      return { where: mockWhere, doc: mockDoc };
    });

    await expect(
      capturedListHandler({ auth: { uid: "u1" }, data: { groupId: "g1" } })
    ).rejects.toThrow("You are not a member of this group");
  });

  it("should return beacons for group member", async () => {
    mockDocGet.mockResolvedValue({ exists: true });
    const fakeBeacons = [
      { id: "b1", data: () => ({ beaconId: "uuid1", zoneName: "Kitchen", floor: 0, rssiAtOneMeter: -59 }) },
      { id: "b2", data: () => ({ beaconId: "uuid2", zoneName: "Bedroom", floor: 1, rssiAtOneMeter: -62 }) },
    ];
    mockGet.mockResolvedValue({ docs: fakeBeacons });
    mockCollection.mockImplementation((col: string) => {
      if (col === "groupMembers") return { doc: () => ({ get: mockDocGet }) };
      if (col === "beacons") return { where: mockWhere };
      return { where: mockWhere, doc: mockDoc };
    });

    const result = await capturedListHandler({ auth: { uid: "u1" }, data: { groupId: "g1" } });

    expect(result).toEqual({
      beacons: [
        { id: "b1", beaconId: "uuid1", zoneName: "Kitchen", floor: 0, rssiAtOneMeter: -59 },
        { id: "b2", beaconId: "uuid2", zoneName: "Bedroom", floor: 1, rssiAtOneMeter: -62 },
      ],
    });
  });
});
