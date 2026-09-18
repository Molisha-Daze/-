package com.example.habittracker

import android.app.Application
import com.example.habittracker.data.repository.HabitRepository
import com.example.habittracker.notification.NotificationHelper

class HabitApplication : Application() {
    val repository: HabitRepository by lazy {
        HabitRepository(this)
    }

    override fun onCreate() {
        super.onCreate()
        NotificationHelper.createNotificationChannel(this)
    }
}
