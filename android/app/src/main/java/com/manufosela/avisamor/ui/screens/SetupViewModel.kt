package com.manufosela.avisamor.ui.screens

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.manufosela.avisamor.data.repository.AuthRepository
import com.manufosela.avisamor.data.repository.GroupRepository
import com.manufosela.avisamor.data.repository.PreferencesRepository
import com.google.firebase.messaging.FirebaseMessaging
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import javax.inject.Inject

data class SetupUiState(
    val step: Int = 1,
    val name: String = "",
    val role: String = "",
    val groupCode: String = "",
    val isCreatingGroup: Boolean = false,
    val isLoading: Boolean = false,
    val error: String? = null,
    val setupComplete: Boolean = false
)

@HiltViewModel
class SetupViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val groupRepository: GroupRepository,
    private val preferencesRepository: PreferencesRepository,
    private val firebaseMessaging: FirebaseMessaging
) : ViewModel() {

    private val _uiState = MutableStateFlow(SetupUiState())
    val uiState: StateFlow<SetupUiState> = _uiState.asStateFlow()

    init {
        ensureSignedIn()
    }

    private fun ensureSignedIn() {
        if (authRepository.isSignedIn()) return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            try {
                authRepository.signInAnonymously()
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = "Error de autenticación: ${e.message}")
            } finally {
                _uiState.value = _uiState.value.copy(isLoading = false)
            }
        }
    }

    fun updateName(name: String) {
        _uiState.value = _uiState.value.copy(name = name, error = null)
    }

    fun goToStep2() {
        if (_uiState.value.name.isBlank()) {
            _uiState.value = _uiState.value.copy(error = "Introduce tu nombre")
            return
        }
        _uiState.value = _uiState.value.copy(step = 2, error = null)
    }

    fun selectRole(role: String) {
        _uiState.value = _uiState.value.copy(role = role, step = 3, error = null)
    }

    fun updateGroupCode(code: String) {
        if (code.length <= 6) {
            _uiState.value = _uiState.value.copy(groupCode = code, error = null)
        }
    }

    fun createGroup() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val result = groupRepository.createGroup(
                    name = _uiState.value.name,
                    role = _uiState.value.role
                )
                val groupId = result["groupId"] as? String ?: ""
                val groupCode = result["code"] as? String ?: ""
                saveAndFinish(groupId, groupCode)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = "Error al crear grupo: ${e.message}"
                )
            }
        }
    }

    fun joinGroup() {
        val code = _uiState.value.groupCode
        if (code.length != 6) {
            _uiState.value = _uiState.value.copy(error = "El código debe tener 6 dígitos")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val result = groupRepository.joinGroup(
                    code = code,
                    displayName = _uiState.value.name,
                    role = _uiState.value.role
                )
                val groupId = result["groupId"] as? String ?: ""
                saveAndFinish(groupId, code)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = "Error al unirse: ${e.message}"
                )
            }
        }
    }

    fun goBack() {
        val current = _uiState.value.step
        if (current > 1) {
            _uiState.value = _uiState.value.copy(step = current - 1, error = null)
        }
    }

    private suspend fun saveAndFinish(groupId: String, groupCode: String) {
        preferencesRepository.saveUserName(_uiState.value.name)
        preferencesRepository.saveUserRole(_uiState.value.role)
        preferencesRepository.saveGroupId(groupId)
        preferencesRepository.saveGroupCode(groupCode)

        try {
            val token = firebaseMessaging.token.await()
            groupRepository.registerFcmToken(groupId, token)
            // Result failure is best-effort; will retry on next token refresh
        } catch (_: Exception) {
            // Token retrieval failed; will retry on next token refresh
        }

        _uiState.value = _uiState.value.copy(isLoading = false, setupComplete = true)
    }
}
