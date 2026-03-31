package com.manufosela.avisamor.data.validation

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class InputValidatorTest {

    // validateGroupId

    @Test
    fun `validateGroupId accepts valid id`() {
        assertEquals("group-123", InputValidator.validateGroupId("group-123"))
    }

    @Test
    fun `validateGroupId rejects blank`() {
        assertThrows(IllegalArgumentException::class.java) {
            InputValidator.validateGroupId("")
        }
    }

    @Test
    fun `validateGroupId rejects whitespace only`() {
        assertThrows(IllegalArgumentException::class.java) {
            InputValidator.validateGroupId("   ")
        }
    }

    @Test
    fun `validateGroupId rejects oversized input`() {
        val ex = assertThrows(IllegalArgumentException::class.java) {
            InputValidator.validateGroupId("a".repeat(200))
        }
        assertEquals("groupId exceeds maximum length of 128 characters", ex.message)
    }

    // validateDisplayName

    @Test
    fun `validateDisplayName accepts valid name`() {
        assertEquals("Manuel", InputValidator.validateDisplayName("Manuel"))
    }

    @Test
    fun `validateDisplayName trims whitespace`() {
        assertEquals("Manuel", InputValidator.validateDisplayName("  Manuel  "))
    }

    @Test
    fun `validateDisplayName rejects blank`() {
        assertThrows(IllegalArgumentException::class.java) {
            InputValidator.validateDisplayName("")
        }
    }

    @Test
    fun `validateDisplayName rejects oversized input`() {
        assertThrows(IllegalArgumentException::class.java) {
            InputValidator.validateDisplayName("a".repeat(101))
        }
    }

    // validateGroupCode

    @Test
    fun `validateGroupCode accepts valid 6-digit code`() {
        assertEquals("123456", InputValidator.validateGroupCode("123456"))
    }

    @Test
    fun `validateGroupCode rejects 5 digits`() {
        assertThrows(IllegalArgumentException::class.java) {
            InputValidator.validateGroupCode("12345")
        }
    }

    @Test
    fun `validateGroupCode rejects alphabetic`() {
        assertThrows(IllegalArgumentException::class.java) {
            InputValidator.validateGroupCode("abcdef")
        }
    }

    @Test
    fun `validateGroupCode rejects empty`() {
        assertThrows(IllegalArgumentException::class.java) {
            InputValidator.validateGroupCode("")
        }
    }

    // validateFcmToken

    @Test
    fun `validateFcmToken accepts valid token`() {
        assertEquals("valid-token-123", InputValidator.validateFcmToken("valid-token-123"))
    }

    @Test
    fun `validateFcmToken rejects blank`() {
        assertThrows(IllegalArgumentException::class.java) {
            InputValidator.validateFcmToken("")
        }
    }

    @Test
    fun `validateFcmToken rejects oversized input`() {
        assertThrows(IllegalArgumentException::class.java) {
            InputValidator.validateFcmToken("a".repeat(4097))
        }
    }

    // validateBeaconId

    @Test
    fun `validateBeaconId accepts valid UUID`() {
        val uuid = "550e8400-e29b-41d4-a716-446655440000"
        assertEquals(uuid, InputValidator.validateBeaconId(uuid))
    }

    @Test
    fun `validateBeaconId rejects blank`() {
        assertThrows(IllegalArgumentException::class.java) {
            InputValidator.validateBeaconId("")
        }
    }

    @Test
    fun `validateBeaconId rejects oversized input`() {
        assertThrows(IllegalArgumentException::class.java) {
            InputValidator.validateBeaconId("a".repeat(200))
        }
    }

    // validateZoneName

    @Test
    fun `validateZoneName accepts valid zone`() {
        assertEquals("Salón", InputValidator.validateZoneName("Salón"))
    }

    @Test
    fun `validateZoneName rejects blank`() {
        assertThrows(IllegalArgumentException::class.java) {
            InputValidator.validateZoneName("")
        }
    }

    @Test
    fun `validateZoneName rejects oversized input`() {
        assertThrows(IllegalArgumentException::class.java) {
            InputValidator.validateZoneName("a".repeat(101))
        }
    }

    // validateAlertId

    @Test
    fun `validateAlertId accepts valid id`() {
        assertEquals("alert-xyz", InputValidator.validateAlertId("alert-xyz"))
    }

    @Test
    fun `validateAlertId rejects blank`() {
        assertThrows(IllegalArgumentException::class.java) {
            InputValidator.validateAlertId("")
        }
    }

    // validateRole

    @Test
    fun `validateRole accepts alerter`() {
        assertEquals("alerter", InputValidator.validateRole("alerter"))
    }

    @Test
    fun `validateRole accepts responder`() {
        assertEquals("responder", InputValidator.validateRole("responder"))
    }

    @Test
    fun `validateRole rejects invalid role`() {
        assertThrows(IllegalArgumentException::class.java) {
            InputValidator.validateRole("admin")
        }
    }

    @Test
    fun `validateRole rejects blank`() {
        assertThrows(IllegalArgumentException::class.java) {
            InputValidator.validateRole("")
        }
    }
}
