package com.manufosela.avisamor.service

import android.content.Context
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.os.PowerManager
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.manufosela.avisamor.data.repository.GroupRepository
import com.manufosela.avisamor.data.repository.PreferencesRepository
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class AvisamorFcmService : FirebaseMessagingService() {

    @Inject lateinit var groupRepository: GroupRepository
    @Inject lateinit var preferencesRepository: PreferencesRepository

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onCreate() {
        super.onCreate()
        NotificationHelper.createAlertNotificationChannel(this)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)

        val data = message.data
        val type = data["type"] ?: return
        val alertId = data["alertId"] ?: return

        when (type) {
            "new_alert" -> handleNewAlert(data, alertId)
            "alert_accepted" -> handleAlertAccepted(data, alertId)
            "alert_dismissed" -> handleAlertDismissed(alertId)
        }
    }

    private fun handleNewAlert(data: Map<String, String>, alertId: String) {
        val alerterName = data["alerterName"] ?: "Alguien"

        acquireWakeLock()

        serviceScope.launch {
            val soundEnabled = preferencesRepository.soundEnabled.first()
            val vibrationEnabled = preferencesRepository.vibrationEnabled.first()
            val flashEnabled = preferencesRepository.flashEnabled.first()

            NotificationHelper.showAlertNotification(
                this@AvisamorFcmService, alerterName, alertId, soundEnabled, vibrationEnabled
            )

            if (flashEnabled) {
                toggleFlash(true)
                delay(3000)
                toggleFlash(false)
            }
        }
    }

    private fun handleAlertAccepted(data: Map<String, String>, alertId: String) {
        val acceptorName = data["acceptorName"] ?: "Alguien"
        val acceptorZone = data["acceptedByZone"]
        val message = if (!acceptorZone.isNullOrBlank()) {
            "$acceptorName va desde $acceptorZone"
        } else {
            "$acceptorName va en camino"
        }
        NotificationHelper.showAcceptedNotification(this, message, alertId)
    }

    private fun handleAlertDismissed(alertId: String) {
        NotificationHelper.cancelAlertNotification(this, alertId)
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        serviceScope.launch {
            val groupId = preferencesRepository.getGroupIdSync()
            if (groupId.isNotBlank()) {
                groupRepository.registerFcmToken(groupId, token)
                // Result failure is ignored — will retry on next app open
            }
        }
    }

    private fun acquireWakeLock() {
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        val wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP,
            "avisamor:alert_wakelock"
        )
        wakeLock.acquire(10_000L) // 10 second timeout
    }

    private fun toggleFlash(on: Boolean) {
        try {
            val cameraManager = getSystemService(Context.CAMERA_SERVICE) as CameraManager
            val cameraId = cameraManager.cameraIdList.firstOrNull { id ->
                cameraManager.getCameraCharacteristics(id)
                    .get(CameraCharacteristics.FLASH_INFO_AVAILABLE) == true
            } ?: return
            cameraManager.setTorchMode(cameraId, on)
        } catch (_: Exception) {
            // Flash not available or permission denied
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        serviceScope.cancel()
    }
}
