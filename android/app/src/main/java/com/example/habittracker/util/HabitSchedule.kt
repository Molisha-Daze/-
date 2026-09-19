package com.example.habittracker.util

import com.example.habittracker.data.entity.CheckIn
import com.example.habittracker.data.entity.Habit
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

/**
 * 习惯排期与完成判定的唯一权威来源。
 *
 * 今日页、月历、热力图统计、通知链路都必须走这里，避免同一份数据被多处各算一遍
 * 得出互相矛盾的结果（历史上 isHabitScheduled 只是 CalendarMonthView 的 private
 * 函数，导致今日页与月历口径不一致）。
 */
object HabitSchedule {

    const val TYPE_NONE = "none"
    const val TYPE_DAILY = "daily"
    const val TYPE_WEEKLY = "weekly"
    const val TYPE_MONTHLY = "monthly"
    const val TYPE_INTERVAL = "interval"

    private val ISO: DateTimeFormatter = DateTimeFormatter.ISO_LOCAL_DATE

    val DEFAULT_TYPE = TYPE_DAILY

    /** 该习惯在 [date] 是否有排期。 */
    fun isScheduled(habit: Habit, date: LocalDate): Boolean {
        val dateStr = date.format(ISO)

        val start = habit.startDate
        if (start.isNotBlank() && dateStr < start) return false
        val end = habit.endDate
        if (!end.isNullOrBlank() && dateStr > end) return false

        return when (habit.recurrenceType) {
            TYPE_NONE -> dateStr == start
            TYPE_DAILY -> true
            TYPE_WEEKLY -> parseWeeklyDays(habit.weeklyDays).contains(date.dayOfWeek.value)
            TYPE_MONTHLY -> parseMonthlyDays(habit.monthlyDays).contains(date.dayOfMonth)
            TYPE_INTERVAL -> {
                val interval = habit.intervalDays.coerceAtLeast(1)
                if (start.isBlank()) return true
                val startObj = runCatching { LocalDate.parse(start, ISO) }.getOrNull() ?: return true
                val diff = ChronoUnit.DAYS.between(startObj, date)
                diff >= 0 && diff % interval == 0L
            }
            else -> true
        }
    }

    /** 字符串日期重载，供只拿到 "yyyy-MM-dd" 的调用方使用。 */
    fun isScheduled(habit: Habit, dateStr: String): Boolean {
        val date = runCatching { LocalDate.parse(dateStr, ISO) }.getOrNull() ?: return false
        return isScheduled(habit, date)
    }

    /** 计数器目标次数，至少为 1。 */
    fun effectiveTarget(habit: Habit): Int = habit.targetCount.coerceAtLeast(1)

    /** 当天已记录的次数。 */
    fun currentCount(checkIn: CheckIn?): Int = checkIn?.count ?: 0

    /**
     * 统一的“是否已完成”判定。
     * - 计数器习惯：累计次数达到目标才算完成
     * - 普通习惯：有打卡记录即算完成
     */
    fun isCompleted(habit: Habit, checkIn: CheckIn?): Boolean {
        if (checkIn == null) return false
        return if (habit.isCounter) {
            checkIn.count >= effectiveTarget(habit)
        } else {
            checkIn.isCompleted || checkIn.count > 0
        }
    }

    /** 把当前次数夹到合法区间内（0..target）。 */
    fun clampCount(habit: Habit, count: Int): Int =
        count.coerceIn(0, if (habit.isCounter) effectiveTarget(habit) else 1)

    fun parseWeeklyDays(raw: String?): Set<Int> =
        raw?.split(",")
            ?.mapNotNull { it.trim().toIntOrNull() }
            ?.filter { it in 1..7 }
            ?.toSet()
            ?: emptySet()

    fun parseMonthlyDays(raw: String?): Set<Int> =
        raw?.split(",")
            ?.mapNotNull { it.trim().toIntOrNull() }
            ?.filter { it in 1..31 }
            ?.toSet()
            ?: emptySet()

    fun formatWeeklyDays(days: Set<Int>): String? =
        if (days.isEmpty()) null else days.sorted().joinToString(",")

    fun formatMonthlyDays(days: Set<Int>): String? =
        if (days.isEmpty()) null else days.sorted().joinToString(",")
}
