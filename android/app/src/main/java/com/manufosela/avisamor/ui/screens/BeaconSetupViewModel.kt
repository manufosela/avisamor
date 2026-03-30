package com.manufosela.avisamor.ui.screens

import android.bluetooth.BluetoothManager
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.manufosela.avisamor.data.repository.BeaconInfo
import com.manufosela.avisamor.data.repository.BeaconRepository
import com.manufosela.avisamor.data.repository.PreferencesRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ScannedBeacon(
    val uuid: String,
    val rssi: Int,
    val deviceName: String
)

data class BeaconSetupUiState(
    val registeredBeacons: List<BeaconInfo> = emptyList(),
    val scannedBeacons: List<ScannedBeacon> = emptyList(),
    val isScanning: Boolean = false,
    val isRegistering: Boolean = false,
    val isLoading: Boolean = true,
    val error: String? = null
)

@HiltViewModel
class BeaconSetupViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val beaconRepository: BeaconRepository,
    private val preferencesRepository: PreferencesRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(BeaconSetupUiState())
    val uiState: StateFlow<BeaconSetupUiState> = _uiState.asStateFlow()

    private var groupId: String = ""

    init {
        viewModelScope.launch {
            groupId = preferencesRepository.getGroupIdSync()
            loadRegisteredBeacons()
        }
    }

    private suspend fun loadRegisteredBeacons() {
        try {
            val beacons = beaconRepository.listBeacons(groupId)
            _uiState.update { it.copy(registeredBeacons = beacons, isLoading = false) }
        } catch (e: Exception) {
            _uiState.update { it.copy(error = "Error cargando beacons: ${e.message}", isLoading = false) }
        }
    }

    fun startScan() {
        val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        val scanner = bluetoothManager?.adapter?.bluetoothLeScanner
        if (scanner == null) {
            _uiState.update { it.copy(error = "Bluetooth no disponible") }
            return
        }

        _uiState.update { it.copy(isScanning = true, scannedBeacons = emptyList(), error = null) }

        val results = mutableMapOf<String, ScannedBeacon>()

        val callback = object : ScanCallback() {
            override fun onScanResult(callbackType: Int, result: ScanResult) {
                val uuid = extractIBeaconUuid(result) ?: return
                val existing = results[uuid]
                if (existing == null || result.rssi > existing.rssi) {
                    results[uuid] = ScannedBeacon(
                        uuid = uuid,
                        rssi = result.rssi,
                        deviceName = result.device.name ?: "Desconocido"
                    )
                    _uiState.update { it.copy(scannedBeacons = results.values.toList().sortedByDescending { b -> b.rssi }) }
                }
            }

            override fun onScanFailed(errorCode: Int) {
                _uiState.update { it.copy(isScanning = false, error = "Error de escaneo: $errorCode") }
            }
        }

        val settings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            .build()

        viewModelScope.launch {
            try {
                scanner.startScan(null, settings, callback)
                delay(5_000)
                scanner.stopScan(callback)
            } catch (e: SecurityException) {
                _uiState.update { it.copy(error = "Permisos BLE necesarios") }
            }
            _uiState.update { it.copy(isScanning = false) }
        }
    }

    fun registerBeacon(uuid: String, zoneName: String, floor: Int) {
        _uiState.update { it.copy(isRegistering = true, error = null) }
        viewModelScope.launch {
            try {
                beaconRepository.registerBeacon(groupId, uuid, zoneName, floor)
                loadRegisteredBeacons()
                _uiState.update { it.copy(isRegistering = false, scannedBeacons = emptyList()) }
            } catch (e: Exception) {
                _uiState.update { it.copy(isRegistering = false, error = "Error: ${e.message}") }
            }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    private fun extractIBeaconUuid(result: ScanResult): String? {
        val scanRecord = result.scanRecord?.bytes ?: return null
        var i = 0
        while (i < scanRecord.size - 4) {
            if (scanRecord[i].toInt() and 0xFF == 0x4C &&
                scanRecord[i + 1].toInt() and 0xFF == 0x00 &&
                scanRecord[i + 2].toInt() and 0xFF == 0x02 &&
                scanRecord[i + 3].toInt() and 0xFF == 0x15
            ) {
                if (i + 20 <= scanRecord.size) {
                    val uuidBytes = scanRecord.sliceArray((i + 4)..(i + 19))
                    val hex = uuidBytes.joinToString("") { "%02x".format(it) }
                    return "${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20, 32)}"
                }
            }
            i++
        }
        return null
    }
}
