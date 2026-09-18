package com.example.habittracker.model

import com.example.habittracker.data.entity.CheckIn
import com.example.habittracker.data.entity.Habit

data class HabitWithStats(
    val habit: Habit,
    val isCompletedToday: Boolean,
    val todayCheckIn: CheckIn? = null,
    val currentStreak: Int = 0,
    val longestStreak: Int = 0,
    val totalCheckIns: Int = 0
)

data class DayProgress(
    val date: String,
    val totalHabitsCount: Int,
    val completedCount: Int,
    val ratio: Float, // 0.0f to 1.0f
    val checkIns: List<CheckIn> = emptyList()
)
