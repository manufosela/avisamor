"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateStringLength = validateStringLength;
exports.validateGroupId = validateGroupId;
exports.validateDisplayName = validateDisplayName;
exports.validateGroupCode = validateGroupCode;
exports.validateFcmToken = validateFcmToken;
exports.validateBeaconId = validateBeaconId;
exports.validateZoneName = validateZoneName;
exports.validateAlertId = validateAlertId;
const https_1 = require("firebase-functions/v2/https");
const MAX_NAME_LENGTH = 100;
const MAX_GROUP_ID_LENGTH = 128;
const MAX_FCM_TOKEN_LENGTH = 4096;
const MAX_BEACON_ID_LENGTH = 128;
const MAX_ZONE_NAME_LENGTH = 100;
const GROUP_CODE_LENGTH = 6;
const GROUP_CODE_PATTERN = /^\d{6}$/;
function validateStringLength(value, fieldName, maxLength) {
    if (value.length > maxLength) {
        throw new https_1.HttpsError("invalid-argument", `${fieldName} exceeds maximum length of ${maxLength} characters`);
    }
}
function validateGroupId(groupId) {
    if (!groupId || typeof groupId !== "string") {
        throw new https_1.HttpsError("invalid-argument", "groupId is required");
    }
    validateStringLength(groupId, "groupId", MAX_GROUP_ID_LENGTH);
}
function validateDisplayName(name) {
    if (!name || typeof name !== "string") {
        throw new https_1.HttpsError("invalid-argument", "Name is required");
    }
    const trimmed = name.trim();
    if (trimmed.length === 0) {
        throw new https_1.HttpsError("invalid-argument", "Name cannot be empty");
    }
    validateStringLength(trimmed, "name", MAX_NAME_LENGTH);
}
function validateGroupCode(code) {
    if (!code || typeof code !== "string") {
        throw new https_1.HttpsError("invalid-argument", "Code is required");
    }
    if (!GROUP_CODE_PATTERN.test(code)) {
        throw new https_1.HttpsError("invalid-argument", "Code must be exactly 6 digits");
    }
}
function validateFcmToken(token) {
    if (!token || typeof token !== "string") {
        throw new https_1.HttpsError("invalid-argument", "FCM token is required");
    }
    validateStringLength(token, "fcmToken", MAX_FCM_TOKEN_LENGTH);
}
function validateBeaconId(beaconId) {
    if (!beaconId || typeof beaconId !== "string") {
        throw new https_1.HttpsError("invalid-argument", "beaconId (UUID) is required");
    }
    validateStringLength(beaconId, "beaconId", MAX_BEACON_ID_LENGTH);
}
function validateZoneName(zone) {
    if (!zone || typeof zone !== "string") {
        throw new https_1.HttpsError("invalid-argument", "zoneName is required");
    }
    validateStringLength(zone, "zoneName", MAX_ZONE_NAME_LENGTH);
}
function validateAlertId(alertId) {
    if (!alertId || typeof alertId !== "string") {
        throw new https_1.HttpsError("invalid-argument", "alertId is required");
    }
    validateStringLength(alertId, "alertId", MAX_GROUP_ID_LENGTH);
}
//# sourceMappingURL=validation.js.map