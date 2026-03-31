package com.manufosela.avisamor.data.repository

import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.functions.FirebaseFunctions
import com.google.firebase.functions.FirebaseFunctionsException
import com.manufosela.avisamor.data.model.AcceptorInfo
import com.manufosela.avisamor.data.model.AlertUiState
import com.manufosela.avisamor.data.validation.InputValidator
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AlertRepository @Inject constructor(
    private val functions: FirebaseFunctions,
    private val firestore: FirebaseFirestore
) {
    suspend fun createAlert(groupId: String, source: String): Result<Map<String, Any>> = runCatching {
        InputValidator.validateGroupId(groupId)
        require(source.isNotBlank()) { "source must not be blank" }

        val data = hashMapOf("groupId" to groupId, "source" to source)
        val result = functions.getHttpsCallable("createAlert").call(data).await()
        parseMapResponse(result.data)
    }

    suspend fun acceptAlert(alertId: String, zone: String? = null): Result<Map<String, Any>> = runCatching {
        InputValidator.validateAlertId(alertId)
        if (zone != null) InputValidator.validateZoneName(zone)

        val data = hashMapOf<String, Any>("alertId" to alertId)
        if (zone != null) {
            data["zone"] = zone
        }
        val result = functions.getHttpsCallable("acceptAlert").call(data).await()
        parseMapResponse(result.data)
    }

    suspend fun resolveAlert(alertId: String): Result<Unit> = runCatching {
        InputValidator.validateAlertId(alertId)

        val data = hashMapOf("alertId" to alertId)
        functions.getHttpsCallable("resolveAlert").call(data).await()
    }

    suspend fun cancelAlert(alertId: String): Result<Unit> = runCatching {
        InputValidator.validateAlertId(alertId)

        val data = hashMapOf("alertId" to alertId)
        functions.getHttpsCallable("cancelAlert").call(data).await()
    }

    fun observeActiveAlert(groupId: String): Flow<AlertUiState?> {
        InputValidator.validateGroupId(groupId)

        return callbackFlow {
            var registration: ListenerRegistration? = null
            registration = firestore.collection("groups").document(groupId)
                .collection("alerts")
                .whereIn("status", listOf("active", "accepted"))
                .limit(1)
                .addSnapshotListener { snapshot, error ->
                    if (error != null) {
                        trySend(null)
                        return@addSnapshotListener
                    }
                    val doc = snapshot?.documents?.firstOrNull()
                    if (doc == null) {
                        trySend(null)
                        return@addSnapshotListener
                    }
                    @Suppress("UNCHECKED_CAST")
                    val acceptedByRaw = doc.get("acceptedBy") as? List<Map<String, Any>> ?: emptyList()
                    val acceptors = acceptedByRaw.map { entry ->
                        AcceptorInfo(
                            uid = entry["uid"] as? String ?: "",
                            name = entry["name"] as? String ?: "",
                            acceptedAt = (entry["acceptedAt"] as? Number)?.toLong() ?: 0L
                        )
                    }
                    val alertState = AlertUiState(
                        alertId = doc.id,
                        status = doc.getString("status") ?: "",
                        alerterName = doc.getString("alerterName") ?: "",
                        acceptedBy = acceptors,
                        createdAt = doc.getLong("createdAt") ?: 0L
                    )
                    trySend(alertState)
                }
            awaitClose { registration?.remove() }
        }
    }

    suspend fun getHistory(groupId: String): Result<List<Map<String, Any>>> = runCatching {
        InputValidator.validateGroupId(groupId)

        val data = hashMapOf("groupId" to groupId)
        val result = functions.getHttpsCallable("getHistory").call(data).await()
        @Suppress("UNCHECKED_CAST")
        (result.data as? List<Map<String, Any>>) ?: emptyList()
    }

    private fun parseMapResponse(data: Any?): Map<String, Any> {
        @Suppress("UNCHECKED_CAST")
        return (data as? Map<String, Any>)
            ?: throw FirebaseFunctionsException("Unexpected response format", FirebaseFunctionsException.Code.INTERNAL, null)
    }
}
