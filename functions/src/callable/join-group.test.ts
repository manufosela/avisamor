import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDoc = vi.fn();
const mockSet = vi.fn().mockResolvedValue(undefined);
const mockGet = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockCollection = vi.fn();

mockDoc.mockReturnValue({ set: mockSet, get: mockGet });
mockWhere.mockReturnValue({ limit: mockLimit });
mockLimit.mockReturnValue({ get: mockGet });
mockCollection.mockReturnValue({ where: mockWhere, doc: mockDoc });

vi.mock("firebase-admin/firestore", () => ({
  getFirestore: () => ({
    collection: mockCollection,
  }),
  FieldValue: {
    serverTimestamp: () => ({ _methodName: "serverTimestamp" }),
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
let capturedOptions: Record<string, unknown>;

vi.mock("firebase-functions/v2/https", () => ({
  onCall: (opts: Record<string, unknown>, handler: (request: unknown) => Promise<unknown>) => {
    capturedOptions = opts;
    capturedHandler = handler;
    return handler;
  },
  HttpsError: class HttpsError extends Error {
    constructor(public code: string, public message: string) {
      super(message);
    }
  },
}));

describe("joinGroup callable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCollection.mockReturnValue({ where: mockWhere, doc: mockDoc });
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockLimit.mockReturnValue({ get: mockGet });
    mockDoc.mockReturnValue({ set: mockSet, get: mockGet });
  });

  it("should be importable and register a handler", async () => {
    await import("./join-group.js");
    expect(capturedHandler).toBeDefined();
  });

  it("should be configured with region europe-west1", async () => {
    await import("./join-group.js");
    expect(capturedOptions).toBeDefined();
    expect(capturedOptions.region).toBe("europe-west1");
  });

  it("should throw unauthenticated if no auth", async () => {
    await import("./join-group.js");
    await expect(
      capturedHandler({ auth: null, data: { code: "123456", displayName: "John", role: "responder" } })
    ).rejects.toThrow("Authentication required");
  });

  it("should throw invalid-argument if code is missing", async () => {
    await import("./join-group.js");
    await expect(
      capturedHandler({ auth: { uid: "user1" }, data: { displayName: "John", role: "responder" } })
    ).rejects.toThrow("Code is required");
  });

  it("should throw not-found if group code does not exist", async () => {
    await import("./join-group.js");
    mockGet.mockResolvedValueOnce({ empty: true, docs: [] });

    await expect(
      capturedHandler({
        auth: { uid: "user1" },
        data: { code: "999999", displayName: "John", role: "responder" },
      })
    ).rejects.toThrow("Group not found");
  });

  it("should throw already-exists if user is already a member", async () => {
    await import("./join-group.js");

    // Group found
    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [{ id: "group1", data: () => ({ groupId: "group1", name: "Family" }) }],
    });

    // Member already exists
    mockGet.mockResolvedValueOnce({ exists: true });

    await expect(
      capturedHandler({
        auth: { uid: "user1" },
        data: { code: "123456", displayName: "John", role: "responder" },
      })
    ).rejects.toThrow("User is already a member");
  });

  it("should create member and return group info on success", async () => {
    await import("./join-group.js");

    // Group found
    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [{ id: "group1", data: () => ({ groupId: "group1", name: "Family" }) }],
    });

    // Member does not exist
    mockGet.mockResolvedValueOnce({ exists: false });

    const result = await capturedHandler({
      auth: { uid: "user1" },
      data: { code: "123456", displayName: "John", role: "responder" },
    });

    expect(result).toEqual({ groupId: "group1", groupName: "Family" });
    expect(mockSet).toHaveBeenCalled();
  });
});
