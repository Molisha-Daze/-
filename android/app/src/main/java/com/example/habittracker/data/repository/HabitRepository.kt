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
import com.example.habittracker.util.ImageStorageManager
import com.example.habittracker.util.StreakCalculator
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map

class HabitRepository(private val context: Context) {
    private val db = HabitDatabase.getInstance(context)
    private val habitDao = db.habitDao()
    private val checkInDao = db.checkInDao()

    val allHabits: Flow<List<Habit>> = habitDao.getAllActiveHabits()

    val allCheckInsWithHabits: Flow<List<CheckInWithHabit>> = checkInDao.getAllCheckInsWithHabit()

    /**
     * Real-time computed habits with streak stats and today's check-in status.
     * No redundant stats table is stored.
     */
    val habitsWithStats: Flow<List<HabitWithStats>> = combine(
        habitDao.getAllActiveHabits(),
        checkInDao.getAllCheckIns()
    ) { habits, allCheckIns ->
        val todayStr = DateUtils.today()
        val todayDate = DateUtils.todayDate()

        // Group check-ins by habitId
        val checkInsByHabit = allCheckIns.groupBy { it.habitId }

        habits.map { habit ->
            val habitCheckIns = checkInsByHabit[habit.id] ?: emptyList()
            val dateSet = habitCheckIns.map { it.date }.toSet()
            val todayCheckIn = habitCheckIns.firstOrNull { it.date == todayStr }

            val streak = StreakCalculator.calculate(dateSet, todayDate)

            HabitWithStats(
                habit = habit,
                isCompletedToday = todayCheckIn != null,
                todayCheckIn = todayCheckIn,
                currentStreak = streak.currentStreak,
                longestStreak = streak.longestStreak,
                totalCheckIns = habitCheckIns.size
            )
        }
    }

    /**
     * Computes completion ratio for recent days to power the Calendar Heat Map.
     */
    fun getHeatMapProgress(daysCount: Int = 35): Flow<List<DayProgress>> = combine(
        habitDao.getAllActiveHabits(),
        checkInDao.getAllCheckIns()
    ) { habits, allCheckIns ->
        val dates = DateUtils.getRecentDates(daysCount)
        val checkInsByDate = allCheckIns.groupBy { it.date }
        val totalActive = habits.size

        dates.map { date ->
            val dayCheckIns = checkInsByDate[date] ?: emptyList()
            // Count unique habits checked in on that date that are still active
            val activeHabitIds = habits.map { it.id }.toSet()
            val validCheckIns = dayCheckIns.filter { activeHabitIds.contains(it.habitId) }
            val count = validCheckIns.size
            val ratio = if (totalActive > 0) (count.toFloat() / totalActive).coerceIn(0f, 1f) else 0f

            DayProgress(
                date = date,
                totalHabitsCount = totalActive,
                completedCount = count,
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

    suspend fun toggleCheckIn(habitId: Long, date: String = DateUtils.today()): Boolean {
        val existing = checkInDao.getCheckIn(habitId, date)
        return if (existing != null) {
            // Delete check in and clean photo
            ImageStorageManager.deleteImageFile(existing.photoPath)
            checkInDao.deleteByHabitAndDate(habitId, date)
            false
        } else {
            checkInDao.insert(
                CheckIn(
                    habitId = habitId,
                    date = date,
                    createdAt = System.currentTimeMillis()
                )
            )
            true
        }
    }

    suspend fun attachPhoto(habitId: Long, date: String, photoPath: String) {
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
}
