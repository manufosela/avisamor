package com.manufosela.avisamor.data.repository

import com.google.firebase.functions.FirebaseFunctions
import com.google.firebase.functions.FirebaseFunctionsException
import com.manufosela.avisamor.data.validation.InputValidator
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class GroupRepository @Inject constructor(
    private val functions: FirebaseFunctions
) {
    suspend fun createGroup(name: String, role: String): Result<Map<String, Any>> = runCatching {
        InputValidator.validateDisplayName(name)
        InputValidator.validateRole(role)

        val data = hashMapOf("name" to name, "role" to role)
        val result = functions.getHttpsCallable("createGroup").call(data).await()
        parseMapResponse(result.data)
    }

    suspend fun joinGroup(code: String, displayName: String, role: String): Result<Map<String, Any>> = runCatching {
        InputValidator.validateGroupCode(code)
        InputValidator.validateDisplayName(displayName)
        InputValidator.validateRole(role)

        val data = hashMapOf("code" to code, "displayName" to displayName, "role" to role)
        val result = functions.getHttpsCallable("joinGroup").call(data).await()
        parseMapResponse(result.data)
    }

    suspend fun registerFcmToken(groupId: String, token: String): Result<Unit> = runCatching {
        InputValidator.validateGroupId(groupId)
        InputValidator.validateFcmToken(token)

        val data = hashMapOf("groupId" to groupId, "token" to token)
        functions.getHttpsCallable("registerFcmToken").call(data).await()
    }

    private fun parseMapResponse(data: Any?): Map<String, Any> {
        @Suppress("UNCHECKED_CAST")
        return (data as? Map<String, Any>)
            ?: throw FirebaseFunctionsException("Unexpected response format", FirebaseFunctionsException.Code.INTERNAL, null)
    }
}
