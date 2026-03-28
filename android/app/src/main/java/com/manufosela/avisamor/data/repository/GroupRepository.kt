package com.manufosela.avisamor.data.repository

import com.google.firebase.functions.FirebaseFunctions
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class GroupRepository @Inject constructor(
    private val functions: FirebaseFunctions
) {
    suspend fun createGroup(name: String, role: String): Map<String, Any> {
        val data = hashMapOf("name" to name, "role" to role)
        val result = functions.getHttpsCallable("createGroup").call(data).await()
        @Suppress("UNCHECKED_CAST")
        return result.data as Map<String, Any>
    }

    suspend fun joinGroup(code: String, displayName: String, role: String): Map<String, Any> {
        val data = hashMapOf("code" to code, "displayName" to displayName, "role" to role)
        val result = functions.getHttpsCallable("joinGroup").call(data).await()
        @Suppress("UNCHECKED_CAST")
        return result.data as Map<String, Any>
    }

    suspend fun registerFcmToken(groupId: String, token: String) {
        val data = hashMapOf("groupId" to groupId, "token" to token)
        functions.getHttpsCallable("registerFcmToken").call(data).await()
    }
}
