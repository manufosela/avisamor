package com.manufosela.avisamor.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.bluetooth.BluetoothManager
import android.bluetooth.le.BluetoothLeScanner
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.content.Intent
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import com.manufosela.avisamor.R
import com.manufosela.avisamor.data.repository.BeaconInfo
import com.manufosela.avisamor.data.repository.BeaconRepository
import com.manufosela.avisamor.data.repository.PreferencesRepository
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class BeaconScanService : Service() {

    @Inject lateinit var beaconRepository: BeaconRepository
    @Inject lateinit var preferencesRepository: PreferencesRepository

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var scanner: BluetoothLeScanner? = null
    private var scanJob: Job? = null
    private var knownBeacons: List<BeaconInfo> = emptyList()
    private var currentZone: String? = null
    private var groupId: String = ""

    companion object {
        private const val TAG = "BeaconScanService"
        private const val CHANNEL_ID = "avisamor_beacon_scan"
        private const val NOTIFICATION_ID = 9001
        private const val SCAN_INTERVAL_MS = 10_000L
        private const val SCAN_DURATION_MS = 3_000L

        fun start(context: Context) {
            val intent = Intent(context, BeaconScanService::class.java)
            context.startForegroundService(intent)
        }

        fun stop(context: Context) {
            val intent = Intent(context, BeaconScanService::class.java)
            context.stopService(intent)
        }
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildNotification("Iniciando escaneo..."))

        val bluetoothManager = getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        scanner = bluetoothManager?.adapter?.bluetoothLeScanner

        if (scanner == null) {
            Log.w(TAG, "BLE scanner not available")
            stopSelf()
            return
        }

        serviceScope.launch {
            groupId = preferencesRepository.getGroupIdSync()
            if (groupId.isBlank()) {
                Log.w(TAG, "No group ID, stopping")
                stopSelf()
                return@launch
            }

            try {
                knownBeacons = beaconRepository.listBeacons(groupId)
                Log.d(TAG, "Loaded ${knownBeacons.size} beacons for group $groupId")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to load beacons", e)
            }

            startScanLoop()
        }
    }

    private fun startScanLoop() {
        scanJob = serviceScope.launch {
            while (true) {
                performScan()
                delay(SCAN_INTERVAL_MS)
            }
        }
    }

    private suspend fun performScan() {
        if (scanner == null || knownBeacons.isEmpty()) return

        val results = mutableListOf<ScanResult>()

        val callback = object : ScanCallback() {
            override fun onScanResult(callbackType: Int, result: ScanResult) {
                results.add(result)
            }

            override fun onBatchScanResults(batchResults: List<ScanResult>) {
                results.addAll(batchResults)
            }

            override fun onScanFailed(errorCode: Int) {
                Log.e(TAG, "Scan failed with error: $errorCode")
            }
        }

        val settings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            .setReportDelay(0)
            .build()

        try {
            scanner?.startScan(null, settings, callback)
            delay(SCAN_DURATION_MS)
            scanner?.stopScan(callback)
        } catch (e: SecurityException) {
            Log.e(TAG, "BLE scan permission denied", e)
            stopSelf()
            return
        }

        processResults(results)
    }

    private fun processResults(results: List<ScanResult>) {
        if (results.isEmpty()) return

        var bestBeacon: BeaconInfo? = null
        var bestRssi = Int.MIN_VALUE

        for (result in results) {
            val advertisedUuid = extractIBeaconUuid(result) ?: continue

            val matchedBeacon = knownBeacons.find {
                it.beaconId.lowercase() == advertisedUuid.lowercase()
            } ?: continue

            if (result.rssi > bestRssi) {
                bestRssi = result.rssi
                bestBeacon = matchedBeacon
            }
        }

        if (bestBeacon != null && bestBeacon.zoneName != currentZone) {
            val previousZone = currentZone
            currentZone = bestBeacon.zoneName
            Log.d(TAG, "Zone changed: $previousZone -> $currentZone")

            updateNotification("Zona: $currentZone")

            serviceScope.launch {
                try {
                    preferencesRepository.saveCurrentZone(currentZone!!)
                    beaconRepository.updateMyZone(groupId, currentZone!!, bestBeacon.beaconId)
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to update zone", e)
                }
            }
        }
    }

    private fun extractIBeaconUuid(result: ScanResult): String? {
        val scanRecord = result.scanRecord?.bytes ?: return null

        // iBeacon format: look for Apple's company ID (0x004C) and iBeacon type (0x02, 0x15)
        var i = 0
        while (i < scanRecord.size - 4) {
            if (scanRecord[i].toInt() and 0xFF == 0x4C &&
                scanRecord[i + 1].toInt() and 0xFF == 0x00 &&
                scanRecord[i + 2].toInt() and 0xFF == 0x02 &&
                scanRecord[i + 3].toInt() and 0xFF == 0x15
            ) {
                if (i + 20 <= scanRecord.size) {
                    val uuidBytes = scanRecord.sliceArray((i + 4)..(i + 19))
                    return formatUuid(uuidBytes)
                }
            }
            i++
        }
        return null
    }

    private fun formatUuid(bytes: ByteArray): String {
        val hex = bytes.joinToString("") { "%02x".format(it) }
        return "${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20, 32)}"
    }

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Escaneo de beacons",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Detecta tu zona actual mediante beacons BLE"
        }
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.createNotificationChannel(channel)
    }

    private fun buildNotification(text: String): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentTitle("Avisamor - Localización")
            .setContentText(text)
            .setOngoing(true)
            .setSilent(true)
            .build()
    }

    private fun updateNotification(text: String) {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(NOTIFICATION_ID, buildNotification(text))
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        scanJob?.cancel()
        serviceScope.cancel()
    }
}
