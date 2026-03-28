package com.manufosela.avisamor.ui.screens

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.manufosela.avisamor.data.repository.PreferencesRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SettingsUiState(
    val userName: String = "",
    val userRole: String = "",
    val groupCode: String = "",
    val soundEnabled: Boolean = true,
    val vibrationEnabled: Boolean = true,
    val flashEnabled: Boolean = false,
    val leftGroup: Boolean = false
)

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val preferencesRepository: PreferencesRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()

    init {
        loadPreferences()
    }

    private fun loadPreferences() {
        viewModelScope.launch {
            launch { preferencesRepository.userName.collect { _uiState.value = _uiState.value.copy(userName = it) } }
            launch { preferencesRepository.userRole.collect { _uiState.value = _uiState.value.copy(userRole = it) } }
            launch { preferencesRepository.groupCode.collect { _uiState.value = _uiState.value.copy(groupCode = it) } }
            launch { preferencesRepository.soundEnabled.collect { _uiState.value = _uiState.value.copy(soundEnabled = it) } }
            launch { preferencesRepository.vibrationEnabled.collect { _uiState.value = _uiState.value.copy(vibrationEnabled = it) } }
            launch { preferencesRepository.flashEnabled.collect { _uiState.value = _uiState.value.copy(flashEnabled = it) } }
        }
    }

    fun toggleSound(enabled: Boolean) {
        viewModelScope.launch {
            preferencesRepository.saveSoundEnabled(enabled)
        }
    }

    fun toggleVibration(enabled: Boolean) {
        viewModelScope.launch {
            preferencesRepository.saveVibrationEnabled(enabled)
        }
    }

    fun toggleFlash(enabled: Boolean) {
        viewModelScope.launch {
            preferencesRepository.saveFlashEnabled(enabled)
        }
    }

    fun leaveGroup() {
        viewModelScope.launch {
            preferencesRepository.clearAll()
            _uiState.value = _uiState.value.copy(leftGroup = true)
        }
    }
}
