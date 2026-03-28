package com.manufosela.avisamor.data.repository

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PreferencesRepository @Inject constructor(
    private val dataStore: DataStore<Preferences>
) {
    companion object {
        private val KEY_USER_NAME = stringPreferencesKey("user_name")
        private val KEY_USER_ROLE = stringPreferencesKey("user_role")
        private val KEY_GROUP_ID = stringPreferencesKey("group_id")
        private val KEY_GROUP_CODE = stringPreferencesKey("group_code")
        private val KEY_SOUND_ENABLED = booleanPreferencesKey("sound_enabled")
        private val KEY_VIBRATION_ENABLED = booleanPreferencesKey("vibration_enabled")
        private val KEY_FLASH_ENABLED = booleanPreferencesKey("flash_enabled")
    }

    val userName: Flow<String> = dataStore.data.map { it[KEY_USER_NAME] ?: "" }
    val userRole: Flow<String> = dataStore.data.map { it[KEY_USER_ROLE] ?: "" }
    val groupId: Flow<String> = dataStore.data.map { it[KEY_GROUP_ID] ?: "" }
    val groupCode: Flow<String> = dataStore.data.map { it[KEY_GROUP_CODE] ?: "" }
    val soundEnabled: Flow<Boolean> = dataStore.data.map { it[KEY_SOUND_ENABLED] ?: true }
    val vibrationEnabled: Flow<Boolean> = dataStore.data.map { it[KEY_VIBRATION_ENABLED] ?: true }
    val flashEnabled: Flow<Boolean> = dataStore.data.map { it[KEY_FLASH_ENABLED] ?: false }

    suspend fun saveUserName(name: String) {
        dataStore.edit { it[KEY_USER_NAME] = name }
    }

    suspend fun saveUserRole(role: String) {
        dataStore.edit { it[KEY_USER_ROLE] = role }
    }

    suspend fun saveGroupId(id: String) {
        dataStore.edit { it[KEY_GROUP_ID] = id }
    }

    suspend fun saveGroupCode(code: String) {
        dataStore.edit { it[KEY_GROUP_CODE] = code }
    }

    suspend fun saveSoundEnabled(enabled: Boolean) {
        dataStore.edit { it[KEY_SOUND_ENABLED] = enabled }
    }

    suspend fun saveVibrationEnabled(enabled: Boolean) {
        dataStore.edit { it[KEY_VIBRATION_ENABLED] = enabled }
    }

    suspend fun saveFlashEnabled(enabled: Boolean) {
        dataStore.edit { it[KEY_FLASH_ENABLED] = enabled }
    }

    suspend fun getGroupIdSync(): String {
        return dataStore.data.first()[KEY_GROUP_ID] ?: ""
    }

    suspend fun getUserRoleSync(): String {
        return dataStore.data.first()[KEY_USER_ROLE] ?: ""
    }

    suspend fun clearAll() {
        dataStore.edit { it.clear() }
    }
}
