package com.manufosela.avisamor.data.repository

import com.google.android.gms.tasks.Tasks
import com.google.firebase.functions.FirebaseFunctions
import com.google.firebase.functions.HttpsCallableReference
import com.google.firebase.functions.HttpsCallableResult
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class BeaconRepositoryTest {

    private lateinit var functions: FirebaseFunctions
    private lateinit var repository: BeaconRepository

    @Before
    fun setUp() {
        functions = mockk()
        repository = BeaconRepository(functions)
    }

    // Validation tests (R-1)

    @Test
    fun `registerBeacon fails with blank groupId`() = runTest {
        val result = repository.registerBeacon("", "uuid", "zone", 1)
        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is IllegalArgumentException)
    }

    @Test
    fun `registerBeacon fails with blank beaconId`() = runTest {
        val result = repository.registerBeacon("g-1", "", "zone", 1)
        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is IllegalArgumentException)
    }

    @Test
    fun `registerBeacon fails with blank zoneName`() = runTest {
        val result = repository.registerBeacon("g-1", "uuid", "", 1)
        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is IllegalArgumentException)
    }

    @Test
    fun `registerBeacon fails with oversized beaconId`() = runTest {
        val result = repository.registerBeacon("g-1", "a".repeat(200), "zone", 1)
        assertTrue(result.isFailure)
    }

    @Test
    fun `listBeacons fails with blank groupId`() = runTest {
        val result = repository.listBeacons("")
        assertTrue(result.isFailure)
    }

    @Test
    fun `updateMyZone fails with blank groupId`() = runTest {
        val result = repository.updateMyZone("", "zone")
        assertTrue(result.isFailure)
    }

    @Test
    fun `updateMyZone fails with blank zone`() = runTest {
        val result = repository.updateMyZone("g-1", "")
        assertTrue(result.isFailure)
    }

    @Test
    fun `updateMyZone fails with oversized zone`() = runTest {
        val result = repository.updateMyZone("g-1", "a".repeat(101))
        assertTrue(result.isFailure)
    }

    // Success path tests (R-3)

    @Test
    fun `registerBeacon returns success with valid response`() = runTest {
        val responseMap = mapOf<String, Any>("id" to "b-1", "beaconId" to "uuid-1")
        mockCallable("registerBeacon", responseMap)

        val result = repository.registerBeacon("g-1", "uuid-1", "Salón", 1)
        assertTrue(result.isSuccess)
        assertEquals("b-1", result.getOrThrow()["id"])
    }

    @Test
    fun `listBeacons returns parsed list on success`() = runTest {
        val beaconsList = listOf(
            mapOf<String, Any>("id" to "b-1", "beaconId" to "uuid-1", "zoneName" to "Salón", "floor" to 1, "rssiAtOneMeter" to -59)
        )
        val responseMap = mapOf<String, Any>("beacons" to beaconsList)
        mockCallable("listBeacons", responseMap)

        val result = repository.listBeacons("g-1")
        assertTrue(result.isSuccess)
        assertEquals(1, result.getOrThrow().size)
        assertEquals("Salón", result.getOrThrow()[0].zoneName)
    }

    @Test
    fun `listBeacons handles empty beacons list`() = runTest {
        val responseMap = mapOf<String, Any>("beacons" to emptyList<Any>())
        mockCallable("listBeacons", responseMap)

        val result = repository.listBeacons("g-1")
        assertTrue(result.isSuccess)
        assertTrue(result.getOrThrow().isEmpty())
    }

    // Malformed response tests (R-2)

    @Test
    fun `registerBeacon fails on null response`() = runTest {
        mockCallable("registerBeacon", null)

        val result = repository.registerBeacon("g-1", "uuid-1", "Salón", 1)
        assertTrue(result.isFailure)
    }

    @Test
    fun `listBeacons fails on null response`() = runTest {
        mockCallable("listBeacons", null)

        val result = repository.listBeacons("g-1")
        assertTrue(result.isFailure)
    }

    private fun mockCallable(name: String, responseData: Any?) {
        val callableResult = mockk<HttpsCallableResult>()
        every { callableResult.data } returns responseData

        val callable = mockk<HttpsCallableReference>()
        every { callable.call(any()) } returns Tasks.forResult(callableResult)

        every { functions.getHttpsCallable(name) } returns callable
    }
}
