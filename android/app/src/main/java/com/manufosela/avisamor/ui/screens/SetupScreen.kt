package com.manufosela.avisamor.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.manufosela.avisamor.ui.theme.Green600
import com.manufosela.avisamor.ui.theme.Red600

@Composable
fun SetupScreen(
    onSetupComplete: (role: String) -> Unit,
    viewModel: SetupViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsState()

    LaunchedEffect(state.setupComplete) {
        if (state.setupComplete) {
            onSetupComplete(state.role)
        }
    }

    Scaffold { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = "Avisamor",
                style = MaterialTheme.typography.headlineLarge,
                color = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Paso ${state.step} de 3",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(32.dp))

            when (state.step) {
                1 -> StepName(state, viewModel)
                2 -> StepRole(viewModel)
                3 -> StepGroup(state, viewModel)
            }

            if (state.error != null) {
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = state.error!!,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall,
                    textAlign = TextAlign.Center
                )
            }

            if (state.isLoading) {
                Spacer(modifier = Modifier.height(16.dp))
                CircularProgressIndicator()
            }

            if (state.step > 1) {
                Spacer(modifier = Modifier.height(16.dp))
                TextButton(onClick = { viewModel.goBack() }) {
                    Text("← Atrás")
                }
            }
        }
    }
}

@Composable
private fun StepName(state: SetupUiState, viewModel: SetupViewModel) {
    Text(
        text = "¿Cómo te llamas?",
        style = MaterialTheme.typography.headlineSmall
    )
    Spacer(modifier = Modifier.height(16.dp))
    OutlinedTextField(
        value = state.name,
        onValueChange = { viewModel.updateName(it) },
        label = { Text("Tu nombre") },
        singleLine = true,
        modifier = Modifier.fillMaxWidth()
    )
    Spacer(modifier = Modifier.height(24.dp))
    Button(
        onClick = { viewModel.goToStep2() },
        modifier = Modifier.fillMaxWidth(),
        enabled = !state.isLoading
    ) {
        Text("Siguiente")
    }
}

@Composable
private fun StepRole(viewModel: SetupViewModel) {
    Text(
        text = "¿Cuál es tu rol?",
        style = MaterialTheme.typography.headlineSmall
    )
    Spacer(modifier = Modifier.height(24.dp))
    Button(
        onClick = { viewModel.selectRole("alertador") },
        modifier = Modifier
            .fillMaxWidth()
            .height(80.dp),
        colors = ButtonDefaults.buttonColors(containerColor = Red600)
    ) {
        Text("Alertador", style = MaterialTheme.typography.titleLarge)
    }
    Spacer(modifier = Modifier.height(16.dp))
    Button(
        onClick = { viewModel.selectRole("receptor") },
        modifier = Modifier
            .fillMaxWidth()
            .height(80.dp),
        colors = ButtonDefaults.buttonColors(containerColor = Green600)
    ) {
        Text("Receptor", style = MaterialTheme.typography.titleLarge)
    }
}

@Composable
private fun StepGroup(state: SetupUiState, viewModel: SetupViewModel) {
    Text(
        text = "Grupo familiar",
        style = MaterialTheme.typography.headlineSmall
    )
    Spacer(modifier = Modifier.height(24.dp))

    Button(
        onClick = { viewModel.createGroup() },
        modifier = Modifier.fillMaxWidth(),
        enabled = !state.isLoading
    ) {
        Text("Crear nuevo grupo")
    }

    Spacer(modifier = Modifier.height(24.dp))
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center
    ) {
        Text("— o únete con código —", style = MaterialTheme.typography.bodyMedium)
    }
    Spacer(modifier = Modifier.height(16.dp))

    OutlinedTextField(
        value = state.groupCode,
        onValueChange = { viewModel.updateGroupCode(it) },
        label = { Text("Código de 6 dígitos") },
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
        modifier = Modifier.fillMaxWidth()
    )
    Spacer(modifier = Modifier.height(16.dp))
    OutlinedButton(
        onClick = { viewModel.joinGroup() },
        modifier = Modifier.fillMaxWidth(),
        enabled = !state.isLoading && state.groupCode.length == 6
    ) {
        Text("Unirse al grupo")
    }
}
