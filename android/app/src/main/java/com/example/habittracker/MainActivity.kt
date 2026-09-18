package com.example.habittracker

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.lifecycle.ViewModelProvider
import com.example.habittracker.ui.screens.MainScreen
import com.example.habittracker.ui.theme.HabitTrackerTheme
import com.example.habittracker.viewmodel.HabitViewModel
import com.example.habittracker.viewmodel.HabitViewModelFactory

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val app = application as HabitApplication
        val viewModel = ViewModelProvider(
            this,
            HabitViewModelFactory(app.repository)
        )[HabitViewModel::class.java]

        setContent {
            HabitTrackerTheme {
                MainScreen(viewModel = viewModel)
            }
        }
    }
}
