package com.manufosela.avisamor

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import androidx.navigation.navDeepLink
import com.manufosela.avisamor.ui.screens.AlerterScreen
import com.manufosela.avisamor.ui.screens.HistoryScreen
import com.manufosela.avisamor.ui.screens.ReceiverAlertScreen
import com.manufosela.avisamor.ui.screens.SettingsScreen
import com.manufosela.avisamor.ui.screens.SetupScreen
import com.manufosela.avisamor.ui.screens.StartDestinationViewModel

@Composable
fun AvisamorNavHost() {
    val startVm: StartDestinationViewModel = hiltViewModel()
    val startRoute by startVm.startRoute.collectAsState()

    if (startRoute == null) return // loading prefs

    val navController = rememberNavController()

    NavHost(navController = navController, startDestination = startRoute!!) {
        composable("setup") {
            SetupScreen(
                onSetupComplete = { role ->
                    val dest = if (role == "alertador") "alerter" else "receiver?alertId="
                    navController.navigate(dest) {
                        popUpTo("setup") { inclusive = true }
                    }
                }
            )
        }

        composable("alerter") {
            AlerterScreen(
                onNavigateToSettings = { navController.navigate("settings") },
                onNavigateToHistory = { navController.navigate("history") }
            )
        }

        composable(
            route = "receiver?alertId={alertId}",
            arguments = listOf(navArgument("alertId") {
                type = NavType.StringType
                defaultValue = ""
            }),
            deepLinks = listOf(
                navDeepLink {
                    uriPattern = "avisamor://alert/{alertId}"
                }
            )
        ) {
            ReceiverAlertScreen(
                onDismiss = {
                    if (navController.previousBackStackEntry != null) {
                        navController.popBackStack()
                    } else {
                        navController.navigate("receiver?alertId=") {
                            popUpTo(navController.graph.startDestinationId) { inclusive = true }
                        }
                    }
                }
            )
        }

        composable("settings") {
            SettingsScreen(
                onBack = { navController.popBackStack() },
                onLeftGroup = {
                    navController.navigate("setup") {
                        popUpTo(navController.graph.id) { inclusive = true }
                    }
                }
            )
        }

        composable("history") {
            HistoryScreen(
                onBack = { navController.popBackStack() }
            )
        }
    }
}
