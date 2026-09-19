package com.example.habittracker.util

import com.example.habittracker.data.entity.CheckIn
import com.example.habittracker.data.entity.Habit
import java.time.LocalDate

data class StreakResult(
    val currentStreak: Int,
    val longestStreak: Int
)

object StreakCalculator {

    /** 回溯窗口上限，避免对极老数据无限回溯 */
    private const val DEFAULT_HISTORY_WINDOW_DAYS = 730L

    /**
     * 按「有排期的日期」计算连续打卡，而不是按自然日。
     *
     * 这是与新增的每周 / 每月 / 每 N 天 / 单次排期配套的关键改动：
     * - 「每周一三五」的习惯，周一、周三都完成 → 连续 2 次，周二没打卡不再把它打断
     * - 「每周一」的习惯，周二查看时仍显示连续 1 次，而不是归零
     * - 「每月 15 号」不再因为中间 29 天没有打卡而永远显示 0
     *
     * @param checkInsByDate 该习惯的全部打卡记录，按 "yyyy-MM-dd" 索引
     * @param referenceToday 参照「今天」，用于判定今天是否还算宽限期内
     */
    fun calculate(
        habit: Habit,
        checkInsByDate: Map<String, CheckIn>,
        referenceToday: LocalDate = DateUtils.todayDate(),
        historyWindowDays: Long = DEFAULT_HISTORY_WINDOW_DAYS
    ): StreakResult {
        if (checkInsByDate.isEmpty()) return StreakResult(0, 0)

        // 回溯起点：窗口上限、最早一次打卡、习惯开始日期，三者取最早
        val windowStart = listOfNotNull(
            referenceToday.minusDays(historyWindowDays),
            checkInsByDate.keys.mapNotNull { runCatching { DateUtils.parseDate(it) }.getOrNull() }.minOrNull(),
            habit.startDate.takeIf { it.isNotBlank() }
                ?.let { runCatching { DateUtils.parseDate(it) }.getOrNull() }
        ).min()

        // 只收集「有排期」的日期。未来日期一律排除，避免提前打卡污染统计。
        val scheduled = buildList {
            var cursor = windowStart
            while (!cursor.isAfter(referenceToday)) {
                if (HabitSchedule.isScheduled(habit, cursor)) add(cursor)
                cursor = cursor.plusDays(1)
            }
        }
        if (scheduled.isEmpty()) return StreakResult(0, 0)

        fun isDone(date: LocalDate): Boolean =
            HabitSchedule.isCompleted(habit, checkInsByDate[DateUtils.formatDate(date)])

        // 最长连续：按排期日期顺序跑一遍
        var longest = 0
        var run = 0
        for (d in scheduled) {
            if (isDone(d)) {
                run++
                if (run > longest) longest = run
            } else {
                run = 0
            }
        }

        // 当前连续：从最近一次排期往前数。
        // 若最后一次排期就是今天且尚未完成，今天还没过完，不算断签，从更早一次继续往前数。
        var current = 0
        var idx = scheduled.size - 1
        if (idx >= 0 && scheduled[idx] == referenceToday && !isDone(referenceToday)) idx--
        while (idx >= 0 && isDone(scheduled[idx])) {
            current++
            idx--
        }

        return StreakResult(current, maxOf(longest, current))
    }
}
