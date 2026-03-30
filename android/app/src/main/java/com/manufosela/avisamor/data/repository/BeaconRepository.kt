package com.manufosela.avisamor.data.repository

import com.google.firebase.functions.FirebaseFunctions
import com.google.firebase.functions.FirebaseFunctionsException
import com.manufosela.avisamor.data.validation.InputValidator
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

data class BeaconInfo(
    val id: String,
    val beaconId: String,
    val zoneName: String,
    val floor: Int,
    val rssiAtOneMeter: Int
)

@Singleton
class BeaconRepository @Inject constructor(
    private val functions: FirebaseFunctions
) {
    suspend fun registerBeacon(
        groupId: String,
        beaconId: String,
        zoneName: String,
        floor: Int,
        rssiAtOneMeter: Int = -59
    ): Result<Map<String, Any>> = runCatching {
        InputValidator.validateGroupId(groupId)
        InputValidator.validateBeaconId(beaconId)
        InputValidator.validateZoneName(zoneName)

        val data = hashMapOf(
            "groupId" to groupId,
            "beaconId" to beaconId,
            "zoneName" to zoneName,
            "floor" to floor,
            "rssiAtOneMeter" to rssiAtOneMeter
        )
        val result = functions.getHttpsCallable("registerBeacon").call(data).await()
        parseMapResponse(result.data)
    }

    suspend fun listBeacons(groupId: String): Result<List<BeaconInfo>> = runCatching {
        InputValidator.validateGroupId(groupId)

        val data = hashMapOf("groupId" to groupId)
        val result = functions.getHttpsCallable("listBeacons").call(data).await()
        val response = parseMapResponse(result.data)
        @Suppress("UNCHECKED_CAST")
        val beacons = response["beacons"] as? List<Map<String, Any>> ?: emptyList()
        beacons.map { b ->
            BeaconInfo(
                id = b["id"] as? String ?: "",
                beaconId = b["beaconId"] as? String ?: "",
                zoneName = b["zoneName"] as? String ?: "",
                floor = (b["floor"] as? Number)?.toInt() ?: 0,
                rssiAtOneMeter = (b["rssiAtOneMeter"] as? Number)?.toInt() ?: -59
            )
        }
    }

    suspend fun updateMyZone(groupId: String, zone: String, beaconId: String? = null): Result<Unit> = runCatching {
        InputValidator.validateGroupId(groupId)
        InputValidator.validateZoneName(zone)
        if (beaconId != null) InputValidator.validateBeaconId(beaconId)

        val data = hashMapOf<String, Any>(
            "groupId" to groupId,
            "zone" to zone
        )
        if (beaconId != null) {
            data["beaconId"] = beaconId
        }
        functions.getHttpsCallable("updateMemberZone").call(data).await()
    }

    private fun parseMapResponse(data: Any?): Map<String, Any> {
        @Suppress("UNCHECKED_CAST")
        return (data as? Map<String, Any>)
            ?: throw FirebaseFunctionsException("Unexpected response format", FirebaseFunctionsException.Code.INTERNAL, null)
    }
}
