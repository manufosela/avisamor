package com.manufosela.avisamor.ui.screens

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.manufosela.avisamor.data.repository.AlertRepository
import com.manufosela.avisamor.data.repository.PreferencesRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HistoryItem(
    val alertId: String,
    val date: Long,
    val alerterName: String,
    val responderName: String,
    val responseTimeMs: Long
)

data class HistoryUiState(
    val items: List<HistoryItem> = emptyList(),
    val totalAlerts: Int = 0,
    val avgResponseTimeSec: Long = 0,
    val isLoading: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class HistoryViewModel @Inject constructor(
    private val alertRepository: AlertRepository,
    private val preferencesRepository: PreferencesRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(HistoryUiState())
    val uiState: StateFlow<HistoryUiState> = _uiState.asStateFlow()

    init {
        loadHistory()
    }

    fun loadHistory() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            val groupId = preferencesRepository.groupId.first()
            alertRepository.getHistory(groupId)
                .onSuccess { rawHistory ->
                    val items = rawHistory.map { entry ->
                        val createdAt = (entry["createdAt"] as? Number)?.toLong() ?: 0L
                        val respondedAt = (entry["respondedAt"] as? Number)?.toLong() ?: 0L
                        HistoryItem(
                            alertId = entry["alertId"] as? String ?: "",
                            date = createdAt,
                            alerterName = entry["alerterName"] as? String ?: "",
                            responderName = entry["responderName"] as? String ?: "—",
                            responseTimeMs = if (respondedAt > 0) respondedAt - createdAt else 0L
                        )
                    }
                    val avgMs = if (items.isNotEmpty()) {
                        items.filter { it.responseTimeMs > 0 }.let { responded ->
                            if (responded.isNotEmpty()) responded.map { it.responseTimeMs }.average().toLong() / 1000
                            else 0L
                        }
                    } else 0L

                    _uiState.value = HistoryUiState(
                        items = items,
                        totalAlerts = items.size,
                        avgResponseTimeSec = avgMs,
                        isLoading = false
                    )
                }.onFailure { e ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = "Error al cargar historial: ${e.message}"
                    )
                }
        }
    }
}
