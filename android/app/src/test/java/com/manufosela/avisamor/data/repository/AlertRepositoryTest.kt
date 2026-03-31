package com.manufosela.avisamor.data.repository

import com.google.android.gms.tasks.Tasks
import com.google.firebase.firestore.FirebaseFirestore
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

class AlertRepositoryTest {

    private lateinit var functions: FirebaseFunctions
    private lateinit var firestore: FirebaseFirestore
    private lateinit var repository: AlertRepository

    @Before
    fun setUp() {
        functions = mockk()
        firestore = mockk()
        repository = AlertRepository(functions, firestore)
    }

    // Validation tests (R-1)

    @Test
    fun `createAlert fails with blank groupId`() = runTest {
        val result = repository.createAlert("", "android")
        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is IllegalArgumentException)
    }

    @Test
    fun `createAlert fails with blank source`() = runTest {
        val result = repository.createAlert("g-1", "")
        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is IllegalArgumentException)
    }

    @Test
    fun `createAlert fails with oversized groupId`() = runTest {
        val result = repository.createAlert("a".repeat(200), "android")
        assertTrue(result.isFailure)
    }

    @Test
    fun `acceptAlert fails with blank alertId`() = runTest {
        val result = repository.acceptAlert("")
        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is IllegalArgumentException)
    }

    @Test
    fun `acceptAlert fails with oversized zone`() = runTest {
        val result = repository.acceptAlert("alert-1", "a".repeat(101))
        assertTrue(result.isFailure)
    }

    @Test
    fun `acceptAlert allows null zone`() = runTest {
        val responseMap = mapOf<String, Any>("status" to "accepted")
        mockCallable("acceptAlert", responseMap)

        val result = repository.acceptAlert("alert-1", null)
        assertTrue(result.isSuccess)
    }

    @Test
    fun `resolveAlert fails with blank alertId`() = runTest {
        val result = repository.resolveAlert("")
        assertTrue(result.isFailure)
    }

    @Test
    fun `cancelAlert fails with blank alertId`() = runTest {
        val result = repository.cancelAlert("")
        assertTrue(result.isFailure)
    }

    @Test
    fun `observeActiveAlert throws on blank groupId`() {
        try {
            repository.observeActiveAlert("")
            assertTrue("Should have thrown", false)
        } catch (e: IllegalArgumentException) {
            assertTrue(e.message!!.contains("groupId"))
        }
    }

    @Test
    fun `getHistory fails with blank groupId`() = runTest {
        val result = repository.getHistory("")
        assertTrue(result.isFailure)
    }

    // Success path tests (R-3)

    @Test
    fun `createAlert returns success with valid response`() = runTest {
        val responseMap = mapOf<String, Any>("alertId" to "a-1")
        mockCallable("createAlert", responseMap)

        val result = repository.createAlert("g-1", "android")
        assertTrue(result.isSuccess)
        assertEquals("a-1", result.getOrThrow()["alertId"])
    }

    @Test
    fun `resolveAlert succeeds`() = runTest {
        mockCallableUnit("resolveAlert")

        val result = repository.resolveAlert("alert-1")
        assertTrue(result.isSuccess)
    }

    @Test
    fun `cancelAlert succeeds`() = runTest {
        mockCallableUnit("cancelAlert")

        val result = repository.cancelAlert("alert-1")
        assertTrue(result.isSuccess)
    }

    @Test
    fun `getHistory returns list on success`() = runTest {
        val historyList = listOf(
            mapOf<String, Any>("alertId" to "a-1", "createdAt" to 1000L)
        )
        mockCallable("getHistory", historyList)

        val result = repository.getHistory("g-1")
        assertTrue(result.isSuccess)
        assertEquals(1, result.getOrThrow().size)
    }

    // Malformed response tests (R-2)

    @Test
    fun `createAlert fails on null response`() = runTest {
        mockCallable("createAlert", null)

        val result = repository.createAlert("g-1", "android")
        assertTrue(result.isFailure)
    }

    @Test
    fun `createAlert fails on non-map response`() = runTest {
        mockCallable("createAlert", 42)

        val result = repository.createAlert("g-1", "android")
        assertTrue(result.isFailure)
    }

    @Test
    fun `acceptAlert fails on null response`() = runTest {
        mockCallable("acceptAlert", null)

        val result = repository.acceptAlert("alert-1")
        assertTrue(result.isFailure)
    }

    private fun mockCallable(name: String, responseData: Any?) {
        val callableResult = mockk<HttpsCallableResult>()
        every { callableResult.data } returns responseData

        val callable = mockk<HttpsCallableReference>()
        every { callable.call(any()) } returns Tasks.forResult(callableResult)

        every { functions.getHttpsCallable(name) } returns callable
    }

    private fun mockCallableUnit(name: String) {
        val callableResult = mockk<HttpsCallableResult>()
        every { callableResult.data } returns mapOf("status" to "ok")

        val callable = mockk<HttpsCallableReference>()
        every { callable.call(any()) } returns Tasks.forResult(callableResult)

        every { functions.getHttpsCallable(name) } returns callable
    }
}
