import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Timestamp } from "firebase-admin/firestore";

const fakeTimestamp = { seconds: 1000, nanoseconds: 0 } as unknown as Timestamp;
const fakeServerTimestamp = { _methodName: "serverTimestamp" };

const mockDoc = vi.fn();
const mockSet = vi.fn().mockResolvedValue(undefined);
const mockGet = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockCollection = vi.fn();

mockDoc.mockReturnValue({ set: mockSet });
mockWhere.mockReturnValue({ limit: mockLimit });
mockLimit.mockReturnValue({ get: mockGet });
mockCollection.mockReturnValue({ where: mockWhere, doc: mockDoc });

vi.mock("firebase-admin/firestore", () => ({
  getFirestore: () => ({
    collection: mockCollection,
  }),
  FieldValue: {
    serverTimestamp: () => fakeServerTimestamp,
  },
  Timestamp: {
    now: () => fakeTimestamp,
  },
}));

vi.mock("firebase-admin/app", () => ({
  initializeApp: vi.fn(),
  getApps: () => [{}],
}));

// Capture the handler and options from onCall
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

describe("createGroup callable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: code is unique (no existing group with that code)
    mockGet.mockResolvedValue({ empty: true });
    mockCollection.mockReturnValue({ where: mockWhere, doc: mockDoc });
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockLimit.mockReturnValue({ get: mockGet });
    mockDoc.mockReturnValue({ set: mockSet, id: "auto-id-123" });
  });

  it("should be importable and register a handler", async () => {
    await import("./create-group.js");
    expect(capturedHandler).toBeDefined();
  });

  it("should be configured with region europe-west1", async () => {
    await import("./create-group.js");
    expect(capturedOptions).toBeDefined();
    expect(capturedOptions.region).toBe("europe-west1");
  });

  it("should throw unauthenticated if no auth", async () => {
    await import("./create-group.js");
    await expect(capturedHandler({ auth: null, data: { name: "Family", role: "alerter" } }))
      .rejects.toThrow("Authentication required");
  });

  it("should throw invalid-argument if name is missing", async () => {
    await import("./create-group.js");
    await expect(capturedHandler({ auth: { uid: "user1" }, data: { role: "alerter" } }))
      .rejects.toThrow("Name is required");
  });

  it("should throw invalid-argument if role is invalid", async () => {
    await import("./create-group.js");
    await expect(capturedHandler({ auth: { uid: "user1" }, data: { name: "Family", role: "admin" } }))
      .rejects.toThrow("Valid role is required");
  });

  it("should create group and member documents", async () => {
    await import("./create-group.js");

    const result = await capturedHandler({
      auth: { uid: "user1" },
      data: { name: "Family", role: "alerter" },
    });

    // Should have queried groups collection for code uniqueness
    expect(mockCollection).toHaveBeenCalledWith("groups");
    // Should have created a group document
    expect(mockSet).toHaveBeenCalled();
    // Result should contain groupId and code
    expect(result).toHaveProperty("groupId");
    expect(result).toHaveProperty("code");
    expect((result as { code: string }).code).toMatch(/^\d{6}$/);
  });

  it("should create member with composite key", async () => {
    await import("./create-group.js");

    await capturedHandler({
      auth: { uid: "user1" },
      data: { name: "Family", role: "responder" },
    });

    // Should have created groupMembers document
    expect(mockCollection).toHaveBeenCalledWith("groupMembers");
  });

  it("should retry code generation if code already exists", async () => {
    await import("./create-group.js");

    // First call: code exists, second call: code is unique
    mockGet
      .mockResolvedValueOnce({ empty: false })
      .mockResolvedValueOnce({ empty: true });

    const result = await capturedHandler({
      auth: { uid: "user1" },
      data: { name: "Family", role: "alerter" },
    });

    expect(result).toHaveProperty("code");
    // Should have checked uniqueness at least twice
    expect(mockGet).toHaveBeenCalledTimes(2);
  });
});
