package com.example.habittracker.notification

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.example.habittracker.data.HabitDatabase
import com.example.habittracker.data.entity.CheckIn
import com.example.habittracker.util.DateUtils
import com.example.habittracker.util.HabitSchedule
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

                    // 习惯可能已经被删除或归档。这里必须先判空再写库：
                    // check_ins 对 habits 有 ForeignKey(onDelete = CASCADE)，
                    // 往一个不存在的 habitId 上 insert 会直接抛 FOREIGN KEY constraint failed。
                    val habit = db.habitDao().getHabitById(habitId)
                    if (habit == null || habit.archived) {
                        NotificationHelper.cancelNotification(context, habitId)
                        NotificationHelper.cancelReminder(context, habitId)
                        return@launch
                    }

                    val today = DateUtils.today()
                    val todayDate = DateUtils.todayDate()

                    // 今天没有排期：可能是用户刚改过排期，也可能是旧闹钟重放的 Action。
                    // 这种情况下绝不能写库，直接把残留通知撤掉。
                    if (!HabitSchedule.isScheduled(habit, todayDate)) {
                        NotificationHelper.cancelNotification(context, habitId)
                        return@launch
                    }

                    val existing = db.checkInDao().getCheckIn(habitId, today)
                    val target = if (habit.isCounter) HabitSchedule.effectiveTarget(habit) else 1

                    if (existing == null) {
                        db.checkInDao().insert(
                            CheckIn(
                                habitId = habitId,
                                date = today,
                                count = target,
                                isCompleted = true,
                                createdAt = System.currentTimeMillis()
                            )
                        )
                    } else {
                        db.checkInDao().update(
                            existing.copy(
                                count = maxOf(existing.count, target),
                                isCompleted = true
                            )
                        )
                    }
                    // Dismiss the notification
                    NotificationHelper.cancelNotification(context, habitId)
                } finally {
                    pendingResult.finish()
                }
            }
        }
    }
}
