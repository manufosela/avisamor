package com.manufosela.avisamor.data.validation

object InputValidator {

    private const val MAX_NAME_LENGTH = 100
    private const val MAX_GROUP_ID_LENGTH = 128
    private const val MAX_FCM_TOKEN_LENGTH = 4096
    private const val MAX_BEACON_ID_LENGTH = 128
    private const val MAX_ZONE_NAME_LENGTH = 100
    private const val GROUP_CODE_LENGTH = 6
    private val GROUP_CODE_PATTERN = Regex("^\\d{6}$")

    fun requireNonBlank(value: String, fieldName: String): String {
        require(value.isNotBlank()) { "$fieldName must not be blank" }
        return value
    }

    fun requireMaxLength(value: String, fieldName: String, maxLength: Int): String {
        require(value.length <= maxLength) {
            "$fieldName exceeds maximum length of $maxLength characters"
        }
        return value
    }

    fun validateGroupId(groupId: String): String {
        requireNonBlank(groupId, "groupId")
        requireMaxLength(groupId, "groupId", MAX_GROUP_ID_LENGTH)
        return groupId
    }

    fun validateDisplayName(name: String): String {
        requireNonBlank(name, "name")
        requireMaxLength(name.trim(), "name", MAX_NAME_LENGTH)
        return name.trim()
    }

    fun validateGroupCode(code: String): String {
        requireNonBlank(code, "code")
        require(GROUP_CODE_PATTERN.matches(code)) { "Code must be exactly $GROUP_CODE_LENGTH digits" }
        return code
    }

    fun validateFcmToken(token: String): String {
        requireNonBlank(token, "fcmToken")
        requireMaxLength(token, "fcmToken", MAX_FCM_TOKEN_LENGTH)
        return token
    }

    fun validateBeaconId(beaconId: String): String {
        requireNonBlank(beaconId, "beaconId")
        requireMaxLength(beaconId, "beaconId", MAX_BEACON_ID_LENGTH)
        return beaconId
    }

    fun validateZoneName(zone: String): String {
        requireNonBlank(zone, "zoneName")
        requireMaxLength(zone, "zoneName", MAX_ZONE_NAME_LENGTH)
        return zone
    }

    fun validateAlertId(alertId: String): String {
        requireNonBlank(alertId, "alertId")
        requireMaxLength(alertId, "alertId", MAX_GROUP_ID_LENGTH)
        return alertId
    }

    fun validateRole(role: String): String {
        requireNonBlank(role, "role")
        require(role == "alerter" || role == "responder") {
            "role must be 'alerter' or 'responder'"
        }
        return role
    }
}
