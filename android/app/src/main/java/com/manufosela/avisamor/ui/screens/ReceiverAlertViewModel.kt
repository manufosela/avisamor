package com.manufosela.avisamor.ui.screens

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.manufosela.avisamor.data.model.AlertUiState
import com.manufosela.avisamor.data.repository.AlertRepository
import com.manufosela.avisamor.data.repository.PreferencesRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ReceiverUiState(
    val activeAlert: AlertUiState? = null,
    val isAccepting: Boolean = false,
    val accepted: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class ReceiverAlertViewModel @Inject constructor(
    private val alertRepository: AlertRepository,
    private val preferencesRepository: PreferencesRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val alertIdFromNav: String? = savedStateHandle["alertId"]

    private val _uiState = MutableStateFlow(ReceiverUiState())
    val uiState: StateFlow<ReceiverUiState> = _uiState.asStateFlow()

    init {
        observeAlerts()
    }

    private fun observeAlerts() {
        viewModelScope.launch {
            val groupId = preferencesRepository.groupId.first()
            if (groupId.isBlank()) return@launch
            alertRepository.observeActiveAlert(groupId).collectLatest { alert ->
                _uiState.value = _uiState.value.copy(activeAlert = alert)
            }
        }
    }

    fun acceptAlert() {
        val alertId = alertIdFromNav ?: _uiState.value.activeAlert?.alertId ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isAccepting = true, error = null)
            try {
                val zone = preferencesRepository.getCurrentZone()
                alertRepository.acceptAlert(alertId, zone)
                _uiState.value = _uiState.value.copy(isAccepting = false, accepted = true)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isAccepting = false,
                    error = "Error al aceptar: ${e.message}"
                )
            }
        }
    }
}
