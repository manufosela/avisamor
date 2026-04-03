package com.manufosela.avisamor.data.repository

import com.google.firebase.functions.FirebaseFunctions
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AlertRepository @Inject constructor(
    private val functions: FirebaseFunctions
) {
    suspend fun acceptAlert(alertId: String, zone: String? = null): Map<String, Any> {
        val data = hashMapOf<String, Any>("alertId" to alertId)
        if (zone != null) data["zone"] = zone
        val result = functions.getHttpsCallable("acceptAlert").call(data).await()
        @Suppress("UNCHECKED_CAST")
        return result.data as Map<String, Any>
    }

    suspend fun resolveAlert(alertId: String) {
        val data = hashMapOf("alertId" to alertId)
        functions.getHttpsCallable("resolveAlert").call(data).await()
    }
}
