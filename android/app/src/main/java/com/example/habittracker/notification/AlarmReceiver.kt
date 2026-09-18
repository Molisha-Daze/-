package com.example.habittracker.notification

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.example.habittracker.data.HabitDatabase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val habitId = intent.getLongExtra(NotificationHelper.EXTRA_HABIT_ID, -1L)
        val habitName = intent.getStringExtra(NotificationHelper.EXTRA_HABIT_NAME) ?: "习惯"
        if (habitId <= 0) return

        // Display the reminder notification
        NotificationHelper.showReminderNotification(context, habitId, habitName)

        // Reschedule for tomorrow at the same exact time
        val pendingResult = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val db = HabitDatabase.getInstance(context)
                val habit = db.habitDao().getHabitById(habitId)
                if (habit != null && !habit.archived && habit.reminderTime != null) {
                    NotificationHelper.scheduleDailyReminder(context, habit)
                }
            } finally {
                pendingResult.finish()
            }
        }
    }
}
