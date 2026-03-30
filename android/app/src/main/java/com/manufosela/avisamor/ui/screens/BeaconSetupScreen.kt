package com.manufosela.avisamor.ui.screens

import android.Manifest
import android.os.Build
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.rememberMultiplePermissionsState

@OptIn(ExperimentalMaterial3Api::class, ExperimentalPermissionsApi::class)
@Composable
fun BeaconSetupScreen(
    onBack: () -> Unit,
    viewModel: BeaconSetupViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsState()
    var showRegisterDialog by remember { mutableStateOf(false) }
    var selectedUuid by remember { mutableStateOf("") }

    val blePermissions = rememberMultiplePermissionsState(
        permissions = buildList {
            add(Manifest.permission.ACCESS_FINE_LOCATION)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                add(Manifest.permission.BLUETOOTH_SCAN)
                add(Manifest.permission.BLUETOOTH_CONNECT)
            }
        }
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Configurar Beacons") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Atrás")
                    }
                }
            )
        }
    ) { padding ->
        if (state.isLoading) {
            Column(
                modifier = Modifier.fillMaxSize().padding(padding),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                CircularProgressIndicator()
            }
            return@Scaffold
        }

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Registered beacons section
            item {
                Text("Beacons registrados", style = MaterialTheme.typography.titleMedium)
            }

            if (state.registeredBeacons.isEmpty()) {
                item {
                    Text(
                        "No hay beacons registrados. Escanea para añadir.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            items(state.registeredBeacons) { beacon ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(beacon.zoneName, fontWeight = FontWeight.Bold)
                        Text("Planta ${beacon.floor}", style = MaterialTheme.typography.bodySmall)
                        Text(
                            beacon.beaconId.take(18) + "...",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            // Scan section
            item {
                Spacer(modifier = Modifier.height(16.dp))
                Text("Escanear beacons", style = MaterialTheme.typography.titleMedium)
                Spacer(modifier = Modifier.height(8.dp))

                if (!blePermissions.allPermissionsGranted) {
                    Button(
                        onClick = { blePermissions.launchMultiplePermissionRequest() },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Conceder permisos Bluetooth")
                    }
                } else {
                    OutlinedButton(
                        onClick = { viewModel.startScan() },
                        modifier = Modifier.fillMaxWidth(),
                        enabled = !state.isScanning
                    ) {
                        if (state.isScanning) {
                            CircularProgressIndicator(modifier = Modifier.height(20.dp).width(20.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Escaneando...")
                        } else {
                            Text("Escanear beacons cercanos")
                        }
                    }
                }
            }

            // Scanned results
            items(state.scannedBeacons) { scanned ->
                val alreadyRegistered = state.registeredBeacons.any {
                    it.beaconId.equals(scanned.uuid, ignoreCase = true)
                }

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = if (alreadyRegistered)
                            MaterialTheme.colorScheme.surfaceVariant
                        else
                            MaterialTheme.colorScheme.secondaryContainer
                    )
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(scanned.deviceName, fontWeight = FontWeight.Bold)
                            Text("RSSI: ${scanned.rssi} dBm", style = MaterialTheme.typography.bodySmall)
                            Text(
                                scanned.uuid.take(18) + "...",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        if (!alreadyRegistered) {
                            IconButton(onClick = {
                                selectedUuid = scanned.uuid
                                showRegisterDialog = true
                            }) {
                                Icon(Icons.Default.Add, contentDescription = "Registrar")
                            }
                        } else {
                            Text(
                                "Registrado",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }

            // Error
            if (state.error != null) {
                item {
                    Text(
                        state.error!!,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }
        }
    }

    // Register dialog
    if (showRegisterDialog) {
        RegisterBeaconDialog(
            uuid = selectedUuid,
            isRegistering = state.isRegistering,
            onDismiss = { showRegisterDialog = false },
            onRegister = { zoneName, floor ->
                viewModel.registerBeacon(selectedUuid, zoneName, floor)
                showRegisterDialog = false
            }
        )
    }
}

@Composable
private fun RegisterBeaconDialog(
    uuid: String,
    isRegistering: Boolean,
    onDismiss: () -> Unit,
    onRegister: (String, Int) -> Unit
) {
    var zoneName by remember { mutableStateOf("") }
    var floor by remember { mutableIntStateOf(0) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Registrar beacon") },
        text = {
            Column {
                Text("UUID: ${uuid.take(23)}...", style = MaterialTheme.typography.bodySmall)
                Spacer(modifier = Modifier.height(12.dp))
                OutlinedTextField(
                    value = zoneName,
                    onValueChange = { zoneName = it },
                    label = { Text("Nombre de zona") },
                    placeholder = { Text("Ej: Cocina, Salón...") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = floor.toString(),
                    onValueChange = { floor = it.toIntOrNull() ?: 0 },
                    label = { Text("Planta") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { onRegister(zoneName, floor) },
                enabled = zoneName.isNotBlank() && !isRegistering
            ) {
                if (isRegistering) {
                    CircularProgressIndicator(modifier = Modifier.height(16.dp).width(16.dp))
                } else {
                    Text("Registrar")
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancelar")
            }
        }
    )
}
