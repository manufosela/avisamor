package com.manufosela.avisamor.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.manufosela.avisamor.ui.theme.Green600
import com.manufosela.avisamor.ui.theme.Red600

@Composable
fun AlerterScreen(
    onNavigateToSettings: () -> Unit,
    onNavigateToHistory: () -> Unit,
    viewModel: AlerterViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsState()

    val buttonColor = when (state.buttonState) {
        AlertButtonState.IDLE -> Red600
        AlertButtonState.SENDING -> Color(0xFFFFC107)
        AlertButtonState.SENT -> Green600
        AlertButtonState.ERROR -> Color(0xFF9E9E9E)
    }

    val buttonText = when (state.buttonState) {
        AlertButtonState.IDLE -> "PULSA PARA\nPEDIR AYUDA"
        AlertButtonState.SENDING -> "ENVIANDO..."
        AlertButtonState.SENT -> "ALERTA\nENVIADA"
        AlertButtonState.ERROR -> "ERROR\nReintentar"
    }

    Scaffold { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                TextButton(onClick = onNavigateToHistory) {
                    Text("Historial")
                }
                TextButton(onClick = onNavigateToSettings) {
                    Text("Ajustes")
                }
            }

            Box(
                modifier = Modifier.weight(1f),
                contentAlignment = Alignment.Center
            ) {
                Button(
                    onClick = {
                        when (state.buttonState) {
                            AlertButtonState.IDLE, AlertButtonState.ERROR -> viewModel.sendAlert()
                            else -> {}
                        }
                    },
                    modifier = Modifier.size(250.dp),
                    shape = CircleShape,
                    colors = ButtonDefaults.buttonColors(containerColor = buttonColor),
                    enabled = state.buttonState == AlertButtonState.IDLE || state.buttonState == AlertButtonState.ERROR
                ) {
                    Text(
                        text = buttonText,
                        fontSize = 24.sp,
                        textAlign = TextAlign.Center,
                        color = Color.White
                    )
                }
            }

            if (state.activeAlert != null) {
                AlertStatusCard(state, viewModel)
            }

            if (state.error != null) {
                Text(
                    text = state.error!!,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(8.dp)
                )
            }
        }
    }
}

@Composable
private fun AlertStatusCard(state: AlerterUiState, viewModel: AlerterViewModel) {
    val alert = state.activeAlert ?: return
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(8.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = "Alerta activa — ${alert.status}",
                style = MaterialTheme.typography.titleMedium
            )
            if (alert.acceptedBy.isNotEmpty()) {
                Spacer(modifier = Modifier.height(8.dp))
                Text("Han respondido:", style = MaterialTheme.typography.bodyMedium)
                alert.acceptedBy.forEach { acceptor ->
                    Text("  • ${acceptor.name}", style = MaterialTheme.typography.bodySmall)
                }
            } else {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    "Esperando respuesta...",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = { viewModel.cancelAlert() }) {
                    Text("Cancelar")
                }
                Button(
                    onClick = { viewModel.resolveAlert() },
                    colors = ButtonDefaults.buttonColors(containerColor = Green600)
                ) {
                    Text("Resuelta")
                }
            }
        }
    }
}
