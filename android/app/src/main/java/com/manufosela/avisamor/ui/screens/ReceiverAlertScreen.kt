package com.manufosela.avisamor.ui.screens

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.manufosela.avisamor.ui.theme.Green600
import com.manufosela.avisamor.ui.theme.Red600
import com.manufosela.avisamor.ui.theme.Red800

@Composable
fun ReceiverAlertScreen(
    onDismiss: () -> Unit,
    viewModel: ReceiverAlertViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsState()

    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val pulseAlpha by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(800, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulseAlpha"
    )

    val bgColor = if (!state.accepted) {
        lerp(Red600, Red800, pulseAlpha)
    } else {
        Green600
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(bgColor),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier.padding(32.dp)
        ) {
            val alerterName = state.activeAlert?.alerterName ?: "Alguien"

            if (!state.accepted) {
                Text(
                    text = "ALERTA",
                    fontSize = 48.sp,
                    color = Color.White,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "$alerterName necesita ayuda",
                    fontSize = 24.sp,
                    color = Color.White,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(48.dp))
                Button(
                    onClick = { viewModel.acceptAlert() },
                    modifier = Modifier
                        .size(200.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Green600),
                    enabled = !state.isAccepting
                ) {
                    Text(
                        text = if (state.isAccepting) "Enviando..." else "VOY YO",
                        fontSize = 32.sp,
                        color = Color.White,
                        textAlign = TextAlign.Center
                    )
                }
                Spacer(modifier = Modifier.height(24.dp))
                TextButton(onClick = onDismiss) {
                    Text(
                        "Cerrar",
                        color = Color.White.copy(alpha = 0.7f),
                        fontSize = 18.sp
                    )
                }
            } else {
                Text(
                    text = "ACEPTADA",
                    fontSize = 48.sp,
                    color = Color.White,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "Has aceptado la alerta de $alerterName",
                    fontSize = 20.sp,
                    color = Color.White,
                    textAlign = TextAlign.Center
                )

                val acceptors = state.activeAlert?.acceptedBy ?: emptyList()
                if (acceptors.size > 1) {
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "También han respondido:",
                        fontSize = 16.sp,
                        color = Color.White.copy(alpha = 0.8f)
                    )
                    acceptors.forEach { a ->
                        Text(
                            text = "• ${a.name}",
                            fontSize = 16.sp,
                            color = Color.White.copy(alpha = 0.8f)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(32.dp))
                Button(
                    onClick = onDismiss,
                    colors = ButtonDefaults.buttonColors(containerColor = Color.White)
                ) {
                    Text("Volver", color = Green600)
                }
            }

            if (state.error != null) {
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = state.error!!,
                    color = Color.Yellow,
                    fontSize = 14.sp
                )
            }
        }
    }
}
