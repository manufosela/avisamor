import { describe, it, expect, vi } from "vitest";

vi.mock("firebase-functions/v2/https", () => ({
  HttpsError: class HttpsError extends Error {
    constructor(public code: string, message: string) {
      super(message);
    }
  },
}));

import {
  validateStringLength,
  validateGroupId,
  validateDisplayName,
  validateGroupCode,
  validateFcmToken,
  validateBeaconId,
  validateZoneName,
  validateAlertId,
} from "./validation.js";

describe("validation utilities", () => {
  describe("validateStringLength", () => {
    it("should pass for strings within limit", () => {
      expect(() => validateStringLength("hello", "field", 10)).not.toThrow();
    });

    it("should throw for strings exceeding limit", () => {
      expect(() => validateStringLength("a".repeat(101), "field", 100)).toThrow(
        "exceeds maximum length",
      );
    });
  });

  describe("validateGroupId", () => {
    it("should throw for empty groupId", () => {
      expect(() => validateGroupId("")).toThrow();
    });

    it("should throw for non-string groupId", () => {
      expect(() => validateGroupId(123)).toThrow();
    });

    it("should throw for null groupId", () => {
      expect(() => validateGroupId(null)).toThrow();
    });

    it("should pass for valid groupId", () => {
      expect(() => validateGroupId("group-123")).not.toThrow();
    });

    it("should throw for excessively long groupId", () => {
      expect(() => validateGroupId("a".repeat(200))).toThrow("exceeds maximum length");
    });
  });

  describe("validateDisplayName", () => {
    it("should throw for empty name", () => {
      expect(() => validateDisplayName("")).toThrow();
    });

    it("should throw for whitespace-only name", () => {
      expect(() => validateDisplayName("   ")).toThrow("cannot be empty");
    });

    it("should pass for valid name", () => {
      expect(() => validateDisplayName("Manuel")).not.toThrow();
    });

    it("should throw for name exceeding 100 chars", () => {
      expect(() => validateDisplayName("a".repeat(101))).toThrow("exceeds maximum length");
    });
  });

  describe("validateGroupCode", () => {
    it("should throw for non-6-digit code", () => {
      expect(() => validateGroupCode("12345")).toThrow("exactly 6 digits");
    });

    it("should throw for alphabetic code", () => {
      expect(() => validateGroupCode("abcdef")).toThrow("exactly 6 digits");
    });

    it("should throw for code with spaces", () => {
      expect(() => validateGroupCode("123 56")).toThrow("exactly 6 digits");
    });

    it("should pass for valid 6-digit code", () => {
      expect(() => validateGroupCode("123456")).not.toThrow();
    });
  });

  describe("validateFcmToken", () => {
    it("should throw for empty token", () => {
      expect(() => validateFcmToken("")).toThrow();
    });

    it("should pass for valid token", () => {
      expect(() => validateFcmToken("valid-fcm-token-123")).not.toThrow();
    });

    it("should throw for token exceeding 4096 chars", () => {
      expect(() => validateFcmToken("a".repeat(4097))).toThrow("exceeds maximum length");
    });
  });

  describe("validateBeaconId", () => {
    it("should throw for empty beaconId", () => {
      expect(() => validateBeaconId("")).toThrow();
    });

    it("should pass for valid UUID", () => {
      expect(() => validateBeaconId("550e8400-e29b-41d4-a716-446655440000")).not.toThrow();
    });

    it("should throw for excessively long beaconId", () => {
      expect(() => validateBeaconId("a".repeat(200))).toThrow("exceeds maximum length");
    });
  });

  describe("validateZoneName", () => {
    it("should throw for empty zone", () => {
      expect(() => validateZoneName("")).toThrow();
    });

    it("should pass for valid zone name", () => {
      expect(() => validateZoneName("Salón")).not.toThrow();
    });

    it("should throw for zone name exceeding 100 chars", () => {
      expect(() => validateZoneName("a".repeat(101))).toThrow("exceeds maximum length");
    });
  });

  describe("validateAlertId", () => {
    it("should throw for empty alertId", () => {
      expect(() => validateAlertId("")).toThrow();
    });

    it("should throw for non-string alertId", () => {
      expect(() => validateAlertId(123)).toThrow();
    });

    it("should throw for null alertId", () => {
      expect(() => validateAlertId(null)).toThrow();
    });

    it("should pass for valid alertId", () => {
      expect(() => validateAlertId("alert-abc-123")).not.toThrow();
    });

    it("should throw for excessively long alertId", () => {
      expect(() => validateAlertId("a".repeat(200))).toThrow("exceeds maximum length");
    });
  });
});
