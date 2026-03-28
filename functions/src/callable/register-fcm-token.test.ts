import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDoc = vi.fn();
const mockGet = vi.fn();
const mockUpdate = vi.fn().mockResolvedValue(undefined);
const mockCollection = vi.fn();

mockDoc.mockReturnValue({ get: mockGet, update: mockUpdate });
mockCollection.mockReturnValue({ doc: mockDoc });

vi.mock("firebase-admin/firestore", () => ({
  getFirestore: () => ({
    collection: mockCollection,
  }),
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

describe("registerFcmToken callable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCollection.mockReturnValue({ doc: mockDoc });
    mockDoc.mockReturnValue({ get: mockGet, update: mockUpdate });
  });

  it("should be importable and register a handler", async () => {
    await import("./register-fcm-token.js");
    expect(capturedHandler).toBeDefined();
  });

  it("should be configured with region europe-west1", async () => {
    await import("./register-fcm-token.js");
    expect(capturedOptions).toBeDefined();
    expect(capturedOptions.region).toBe("europe-west1");
  });

  it("should throw unauthenticated if no auth", async () => {
    await import("./register-fcm-token.js");
    await expect(
      capturedHandler({ auth: null, data: { groupId: "group1", fcmToken: "token123" } })
    ).rejects.toThrow("Authentication required");
  });

  it("should throw invalid-argument if groupId is missing", async () => {
    await import("./register-fcm-token.js");
    await expect(
      capturedHandler({ auth: { uid: "user1" }, data: { fcmToken: "token123" } })
    ).rejects.toThrow("Group ID is required");
  });

  it("should throw invalid-argument if fcmToken is missing", async () => {
    await import("./register-fcm-token.js");
    await expect(
      capturedHandler({ auth: { uid: "user1" }, data: { groupId: "group1" } })
    ).rejects.toThrow("FCM token is required");
  });

  it("should throw not-found if user is not a member", async () => {
    await import("./register-fcm-token.js");
    mockGet.mockResolvedValueOnce({ exists: false });

    await expect(
      capturedHandler({
        auth: { uid: "user1" },
        data: { groupId: "group1", fcmToken: "token123" },
      })
    ).rejects.toThrow("User is not a member");
  });

  it("should update fcmToken on success", async () => {
    await import("./register-fcm-token.js");
    mockGet.mockResolvedValueOnce({ exists: true });

    const result = await capturedHandler({
      auth: { uid: "user1" },
      data: { groupId: "group1", fcmToken: "token123" },
    });

    expect(mockUpdate).toHaveBeenCalledWith({ fcmToken: "token123" });
    expect(result).toEqual({ success: true });
  });
});
