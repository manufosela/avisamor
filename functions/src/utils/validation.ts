import { HttpsError } from "firebase-functions/v2/https";

const MAX_NAME_LENGTH = 100;
const MAX_GROUP_ID_LENGTH = 128;
const MAX_FCM_TOKEN_LENGTH = 4096;
const MAX_BEACON_ID_LENGTH = 128;
const MAX_ZONE_NAME_LENGTH = 100;
const GROUP_CODE_LENGTH = 6;
const GROUP_CODE_PATTERN = /^\d{6}$/;

export function validateStringLength(
  value: string,
  fieldName: string,
  maxLength: number,
): void {
  if (value.length > maxLength) {
    throw new HttpsError(
      "invalid-argument",
      `${fieldName} exceeds maximum length of ${maxLength} characters`,
    );
  }
}

export function validateGroupId(groupId: unknown): asserts groupId is string {
  if (!groupId || typeof groupId !== "string") {
    throw new HttpsError("invalid-argument", "groupId is required");
  }
  validateStringLength(groupId, "groupId", MAX_GROUP_ID_LENGTH);
}

export function validateDisplayName(name: unknown): asserts name is string {
  if (!name || typeof name !== "string") {
    throw new HttpsError("invalid-argument", "Name is required");
  }
  const trimmed = (name as string).trim();
  if (trimmed.length === 0) {
    throw new HttpsError("invalid-argument", "Name cannot be empty");
  }
  validateStringLength(trimmed, "name", MAX_NAME_LENGTH);
}

export function validateGroupCode(code: unknown): asserts code is string {
  if (!code || typeof code !== "string") {
    throw new HttpsError("invalid-argument", "Code is required");
  }
  if (!GROUP_CODE_PATTERN.test(code)) {
    throw new HttpsError("invalid-argument", "Code must be exactly 6 digits");
  }
}

export function validateFcmToken(token: unknown): asserts token is string {
  if (!token || typeof token !== "string") {
    throw new HttpsError("invalid-argument", "FCM token is required");
  }
  validateStringLength(token, "fcmToken", MAX_FCM_TOKEN_LENGTH);
}

export function validateBeaconId(beaconId: unknown): asserts beaconId is string {
  if (!beaconId || typeof beaconId !== "string") {
    throw new HttpsError("invalid-argument", "beaconId (UUID) is required");
  }
  validateStringLength(beaconId, "beaconId", MAX_BEACON_ID_LENGTH);
}

export function validateZoneName(zone: unknown): asserts zone is string {
  if (!zone || typeof zone !== "string") {
    throw new HttpsError("invalid-argument", "zoneName is required");
  }
  validateStringLength(zone, "zoneName", MAX_ZONE_NAME_LENGTH);
}

export function validateAlertId(alertId: unknown): asserts alertId is string {
  if (!alertId || typeof alertId !== "string") {
    throw new HttpsError("invalid-argument", "alertId is required");
  }
  validateStringLength(alertId, "alertId", MAX_GROUP_ID_LENGTH);
}
