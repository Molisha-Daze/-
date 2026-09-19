package com.example.habittracker.data.repository

import android.content.Context
import com.example.habittracker.data.HabitDatabase
import com.example.habittracker.data.dao.CheckInWithHabit
import com.example.habittracker.data.entity.CheckIn
import com.example.habittracker.data.entity.Habit
import com.example.habittracker.model.DayProgress
import com.example.habittracker.model.HabitWithStats
import com.example.habittracker.notification.NotificationHelper
import com.example.habittracker.util.DateUtils
import com.example.habittracker.util.HabitSchedule
import com.example.habittracker.util.ImageStorageManager
import com.example.habittracker.util.StreakCalculator
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine

class HabitRepository(private val context: Context) {
    private val db = HabitDatabase.getInstance(context)
    private val habitDao = db.habitDao()
    private val checkInDao = db.checkInDao()

    val allHabits: Flow<List<Habit>> = habitDao.getAllActiveHabits()

    val allCheckIns: Flow<List<CheckIn>> = checkInDao.getAllCheckIns()

    val allCheckInsWithHabits: Flow<List<CheckInWithHabit>> = checkInDao.getAllCheckInsWithHabit()

    /**
     * 全部活跃习惯 + 连续打卡统计。
     *
     * 这里返回的是**所有**活跃习惯（含今天没有排期的），因为「习惯管理」页要列出全部；
     * 今日页请用 [com.example.habittracker.viewmodel.HabitViewModel.todayHabits]，
     * 它按 [HabitSchedule.isScheduled] 过滤出今天真正该做的。
     */
    val habitsWithStats: Flow<List<HabitWithStats>> = combine(
        habitDao.getAllActiveHabits(),
        checkInDao.getAllCheckIns()
    ) { habits, allCheckIns ->
        val todayStr = DateUtils.today()
        val todayDate = DateUtils.todayDate()

        val checkInsByHabit = allCheckIns.groupBy { it.habitId }

        habits.map { habit ->
            val habitCheckIns = checkInsByHabit[habit.id] ?: emptyList()
            val dateSet = habitCheckIns.map { it.date }.toSet()
            val todayCheckIn = habitCheckIns.firstOrNull { it.date == todayStr }

            val streak = StreakCalculator.calculate(dateSet, todayDate)

            HabitWithStats(
                habit = habit,
                scheduledToday = HabitSchedule.isScheduled(habit, todayDate),
                isCompletedToday = HabitSchedule.isCompleted(habit, todayCheckIn),
                todayCheckIn = todayCheckIn,
                currentStreak = streak.currentStreak,
                longestStreak = streak.longestStreak,
                totalCheckIns = habitCheckIns.size
            )
        }
    }

    /**
     * 计算最近若干天的完成率，用于日历热力图。
     * 分母是**当天有排期的习惯数**而不是全部活跃习惯数，
     * 否则「每周一三五」这类习惯会把没排期的日子全部拉低成未完成。
     */
    fun getHeatMapProgress(daysCount: Int = 35): Flow<List<DayProgress>> = combine(
        habitDao.getAllActiveHabits(),
        checkInDao.getAllCheckIns()
    ) { habits, allCheckIns ->
        val dates = DateUtils.getRecentDates(daysCount)
        val checkInsByDate = allCheckIns.groupBy { it.date }

        dates.map { date ->
            val dayCheckIns = checkInsByDate[date] ?: emptyList()
            val checkInByHabit = dayCheckIns.associateBy { it.habitId }

            val scheduled = habits.filter { HabitSchedule.isScheduled(it, date) }
            val completedCount = scheduled.count { habit ->
                HabitSchedule.isCompleted(habit, checkInByHabit[habit.id])
            }
            val total = scheduled.size
            val ratio = if (total > 0) (completedCount.toFloat() / total).coerceIn(0f, 1f) else 0f

            DayProgress(
                date = date,
                totalHabitsCount = total,
                completedCount = completedCount,
                ratio = ratio,
                checkIns = dayCheckIns
            )
        }
    }

    suspend fun addHabit(habit: Habit): Long {
        val id = habitDao.insert(habit)
        val created = habit.copy(id = id)
        if (created.reminderTime != null) {
            NotificationHelper.scheduleDailyReminder(context, created)
        }
        return id
    }

    suspend fun updateHabit(habit: Habit) {
        habitDao.update(habit)
        if (habit.reminderTime != null) {
            NotificationHelper.scheduleDailyReminder(context, habit)
        } else {
            NotificationHelper.cancelReminder(context, habit.id)
        }
    }

    suspend fun deleteHabit(habit: Habit) {
        NotificationHelper.cancelReminder(context, habit.id)
        NotificationHelper.cancelNotification(context, habit.id)
        // clean up associated photos
        val checkIns = checkInDao.getCheckInsForHabitSync(habit.id)
        for (c in checkIns) {
            ImageStorageManager.deleteImageFile(c.photoPath)
        }
        habitDao.delete(habit)
    }

    suspend fun updateHabitOrder(habits: List<Habit>) {
        habits.forEachIndexed { index, habit ->
            habitDao.updateSortOrder(habit.id, index)
        }
    }

    /**
     * 打卡开关。普通习惯是「有记录则删除 / 无记录则新建」；
     * 计数器习惯转发到 [incrementCheckIn]，点满目标后再点一次归零。
     *
     * @return 操作后是否处于「已完成」状态；未来日期或习惯不存在时返回 null。
     */
    suspend fun toggleCheckIn(habitId: Long, date: String = DateUtils.today()): Boolean? {
        if (!isWritableDate(date)) return null
        val habit = habitDao.getHabitById(habitId) ?: return null
        if (habit.isCounter) {
            val existing = checkInDao.getCheckIn(habitId, date)
            return if (existing != null && existing.count >= HabitSchedule.effectiveTarget(habit)) {
                ImageStorageManager.deleteImageFile(existing.photoPath)
                checkInDao.deleteByHabitAndDate(habitId, date)
                false
            } else {
                val next = incrementCheckIn(habitId, date) ?: return null
                next >= HabitSchedule.effectiveTarget(habit)
            }
        }

        val existing = checkInDao.getCheckIn(habitId, date)
        val nowCompleted = if (existing != null) {
            ImageStorageManager.deleteImageFile(existing.photoPath)
            checkInDao.deleteByHabitAndDate(habitId, date)
            false
        } else {
            checkInDao.insert(
                CheckIn(
                    habitId = habitId,
                    date = date,
                    count = 1,
                    isCompleted = true,
                    createdAt = System.currentTimeMillis()
                )
            )
            true
        }
        if (nowCompleted) NotificationHelper.cancelNotification(context, habitId)
        return nowCompleted
    }

    /**
     * 计数器习惯 +1，达到目标次数后置为完成。
     * @return 操作后的当前次数；未来日期或习惯不存在时返回 null。
     */
    suspend fun incrementCheckIn(habitId: Long, date: String = DateUtils.today()): Int? {
        if (!isWritableDate(date)) return null
        val habit = habitDao.getHabitById(habitId) ?: return null

        val target = HabitSchedule.effectiveTarget(habit)
        val existing = checkInDao.getCheckIn(habitId, date)
        val next = ((existing?.count ?: 0) + 1).coerceAtMost(if (habit.isCounter) target else 1)

        if (existing == null) {
            checkInDao.insert(
                CheckIn(
                    habitId = habitId,
                    date = date,
                    count = next,
                    isCompleted = next >= target,
                    createdAt = System.currentTimeMillis()
                )
            )
        } else {
            checkInDao.update(existing.copy(count = next, isCompleted = next >= target))
        }
        if (next >= target) NotificationHelper.cancelNotification(context, habitId)
        return next
    }

    /**
     * 计数器习惯 -1，减到 0 时删除整条打卡记录（连带清理照片）。
     * @return 操作后的当前次数；未来日期或习惯不存在时返回 null。
     */
    suspend fun decrementCheckIn(habitId: Long, date: String = DateUtils.today()): Int? {
        if (!isWritableDate(date)) return null
        val habit = habitDao.getHabitById(habitId) ?: return null

        val existing = checkInDao.getCheckIn(habitId, date) ?: return 0
        val next = (existing.count - 1).coerceAtLeast(0)

        if (next <= 0) {
            ImageStorageManager.deleteImageFile(existing.photoPath)
            checkInDao.deleteByHabitAndDate(habitId, date)
        } else {
            checkInDao.update(
                existing.copy(count = next, isCompleted = next >= HabitSchedule.effectiveTarget(habit))
            )
        }
        return next
    }

    suspend fun attachPhoto(habitId: Long, date: String, photoPath: String) {
        if (!isWritableDate(date)) return
        val existing = checkInDao.getCheckIn(habitId, date)
        if (existing != null) {
            // Remove previous photo if different
            if (existing.photoPath != null && existing.photoPath != photoPath) {
                ImageStorageManager.deleteImageFile(existing.photoPath)
            }
            checkInDao.updatePhotoPath(habitId, date, photoPath)
        } else {
            // If not yet checked in, create check in with photo
            checkInDao.insert(
                CheckIn(
                    habitId = habitId,
                    date = date,
                    photoPath = photoPath,
                    createdAt = System.currentTimeMillis()
                )
            )
        }
    }

    suspend fun removePhoto(habitId: Long, date: String) {
        val existing = checkInDao.getCheckIn(habitId, date)
        if (existing?.photoPath != null) {
            ImageStorageManager.deleteImageFile(existing.photoPath)
            checkInDao.updatePhotoPath(habitId, date, null)
        }
    }

    /** 不允许为未来日期写入打卡记录——这是数据层的最后一道防线。 */
    private fun isWritableDate(date: String): Boolean = date <= DateUtils.today()
}
