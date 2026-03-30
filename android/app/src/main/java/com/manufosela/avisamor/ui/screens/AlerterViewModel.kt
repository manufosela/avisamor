package com.manufosela.avisamor.ui.screens

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

enum class AlertButtonState { IDLE, SENDING, SENT, ERROR }

data class AlerterUiState(
    val buttonState: AlertButtonState = AlertButtonState.IDLE,
    val activeAlert: AlertUiState? = null,
    val error: String? = null
)

@HiltViewModel
class AlerterViewModel @Inject constructor(
    private val alertRepository: AlertRepository,
    private val preferencesRepository: PreferencesRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(AlerterUiState())
    val uiState: StateFlow<AlerterUiState> = _uiState.asStateFlow()

    init {
        observeAlerts()
    }

    private fun observeAlerts() {
        viewModelScope.launch {
            val groupId = preferencesRepository.groupId.first()
            if (groupId.isBlank()) return@launch
            alertRepository.observeActiveAlert(groupId).collectLatest { alert ->
                _uiState.value = _uiState.value.copy(
                    activeAlert = alert,
                    buttonState = if (alert != null) AlertButtonState.SENT else AlertButtonState.IDLE
                )
            }
        }
    }

    fun sendAlert() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(buttonState = AlertButtonState.SENDING, error = null)
            val groupId = preferencesRepository.groupId.first()
            try {
                alertRepository.createAlert(groupId, "android")
                _uiState.value = _uiState.value.copy(buttonState = AlertButtonState.SENT)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    buttonState = AlertButtonState.ERROR,
                    error = "Error al enviar alerta: ${e.message}"
                )
            }
        }
    }

    fun cancelAlert() {
        val alertId = _uiState.value.activeAlert?.alertId ?: return
        viewModelScope.launch {
            try {
                alertRepository.cancelAlert(alertId)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = "Error al cancelar: ${e.message}")
            }
        }
    }

    fun resolveAlert() {
        val alertId = _uiState.value.activeAlert?.alertId ?: return
        viewModelScope.launch {
            try {
                alertRepository.resolveAlert(alertId)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = "Error al resolver: ${e.message}")
            }
        }
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }
}
