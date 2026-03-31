package com.manufosela.avisamor.data.repository

import com.google.firebase.functions.FirebaseFunctions
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
    ): Map<String, Any> {
        val data = hashMapOf(
            "groupId" to groupId,
            "beaconId" to beaconId,
            "zoneName" to zoneName,
            "floor" to floor,
            "rssiAtOneMeter" to rssiAtOneMeter
        )
        val result = functions.getHttpsCallable("registerBeacon").call(data).await()
        @Suppress("UNCHECKED_CAST")
        return result.data as Map<String, Any>
    }

    suspend fun listBeacons(groupId: String): List<BeaconInfo> {
        val data = hashMapOf("groupId" to groupId)
        val result = functions.getHttpsCallable("listBeacons").call(data).await()
        @Suppress("UNCHECKED_CAST")
        val response = result.data as Map<String, Any>
        @Suppress("UNCHECKED_CAST")
        val beacons = response["beacons"] as? List<Map<String, Any>> ?: emptyList()
        return beacons.map { b ->
            BeaconInfo(
                id = b["id"] as? String ?: "",
                beaconId = b["beaconId"] as? String ?: "",
                zoneName = b["zoneName"] as? String ?: "",
                floor = (b["floor"] as? Number)?.toInt() ?: 0,
                rssiAtOneMeter = (b["rssiAtOneMeter"] as? Number)?.toInt() ?: -59
            )
        }
    }

    suspend fun updateMyZone(groupId: String, zone: String, beaconId: String? = null) {
        val data = hashMapOf<String, Any>(
            "groupId" to groupId,
            "zone" to zone
        )
        if (beaconId != null) {
            data["beaconId"] = beaconId
        }
        functions.getHttpsCallable("updateMemberZone").call(data).await()
    }
}
