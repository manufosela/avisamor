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

class GroupRepositoryTest {

    private lateinit var functions: FirebaseFunctions
    private lateinit var repository: GroupRepository

    @Before
    fun setUp() {
        functions = mockk()
        repository = GroupRepository(functions)
    }

    // Validation tests (R-1)

    @Test
    fun `createGroup fails with blank name`() = runTest {
        val result = repository.createGroup("", "alerter")
        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is IllegalArgumentException)
    }

    @Test
    fun `createGroup fails with invalid role`() = runTest {
        val result = repository.createGroup("Test", "admin")
        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is IllegalArgumentException)
    }

    @Test
    fun `joinGroup fails with invalid code`() = runTest {
        val result = repository.joinGroup("abc", "Name", "alerter")
        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is IllegalArgumentException)
    }

    @Test
    fun `joinGroup fails with blank displayName`() = runTest {
        val result = repository.joinGroup("123456", "", "alerter")
        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is IllegalArgumentException)
    }

    @Test
    fun `registerFcmToken fails with blank groupId`() = runTest {
        val result = repository.registerFcmToken("", "token")
        assertTrue(result.isFailure)
    }

    @Test
    fun `registerFcmToken fails with blank token`() = runTest {
        val result = repository.registerFcmToken("group-1", "")
        assertTrue(result.isFailure)
    }

    // Success path tests (R-2, R-3)

    @Test
    fun `createGroup returns success with valid response`() = runTest {
        val responseMap = mapOf<String, Any>("groupId" to "g-1", "code" to "123456")
        mockCallable("createGroup", responseMap)

        val result = repository.createGroup("Test User", "alerter")
        assertTrue(result.isSuccess)
        assertEquals("g-1", result.getOrThrow()["groupId"])
    }

    @Test
    fun `joinGroup returns success with valid response`() = runTest {
        val responseMap = mapOf<String, Any>("groupId" to "g-1", "groupName" to "Family")
        mockCallable("joinGroup", responseMap)

        val result = repository.joinGroup("123456", "Test User", "responder")
        assertTrue(result.isSuccess)
        assertEquals("g-1", result.getOrThrow()["groupId"])
    }

    // Malformed response tests (R-2)

    @Test
    fun `createGroup fails on null response`() = runTest {
        mockCallable("createGroup", null)

        val result = repository.createGroup("Test", "alerter")
        assertTrue(result.isFailure)
    }

    @Test
    fun `createGroup fails on non-map response`() = runTest {
        mockCallable("createGroup", "unexpected string")

        val result = repository.createGroup("Test", "alerter")
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
