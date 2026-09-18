package com.example.habittracker.notification

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.example.habittracker.data.HabitDatabase
import com.example.habittracker.data.entity.CheckIn
import com.example.habittracker.util.DateUtils
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * 提醒通知 Action 广播接收器：
 * 当用户在系统通知栏点击「标记完成」时，直接在后台写入数据库标记为完成，
 * 用户无需打开 App，完成后自动消除通知。
 */
class CheckInActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == NotificationHelper.ACTION_CHECK_IN) {
            val habitId = intent.getLongExtra(NotificationHelper.EXTRA_HABIT_ID, -1L)
            if (habitId <= 0) return

            val pendingResult = goAsync()
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val db = HabitDatabase.getInstance(context)
                    val today = DateUtils.today()
                    val habit = db.habitDao().getHabitById(habitId)
                    val targetCount = habit?.targetCount ?: 1
                    val isCounter = habit?.isCounter ?: false

                    val existing = db.checkInDao().getCheckIn(habitId, today)
                    if (existing == null) {
                        db.checkInDao().insert(
                            CheckIn(
                                habitId = habitId,
                                date = today,
                                count = if (isCounter) targetCount else 1,
                                isCompleted = true,
                                createdAt = System.currentTimeMillis()
                            )
                        )
                    } else {
                        db.checkInDao().update(
                            existing.copy(
                                count = if (isCounter) targetCount else 1,
                                isCompleted = true
                            )
                        )
                    }
                    // Dismiss the notification directly
                    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                    manager.cancel(habitId.toInt())
                } finally {
                    pendingResult.finish()
                }
            }
        }
    }
}
