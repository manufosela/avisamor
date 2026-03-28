package com.manufosela.avisamor.data.model

data class AlertUiState(
    val alertId: String,
    val status: String,
    val alerterName: String,
    val acceptedBy: List<AcceptorInfo>,
    val createdAt: Long
)

data class AcceptorInfo(
    val uid: String,
    val name: String,
    val acceptedAt: Long
)
