package com.example.habittracker.util

import com.example.habittracker.data.entity.CheckIn
import com.example.habittracker.data.entity.Habit
import org.junit.Assert.assertEquals
import org.junit.Test
import java.time.LocalDate

/**
 * 排期感知的连续打卡算法验证。
 *
 * 2026-09-19 是周六，据此推算：
 *   09-14 周一 / 09-15 周二 / 09-16 周三 / 09-17 周四 / 09-18 周五
 *   09-07 周一（上一周）
 */
class StreakCalculatorTest {

    private fun checkInsOn(vararg dates: String): Map<String, CheckIn> =
        dates.associateWith { CheckIn(habitId = 1, date = it, isCompleted = true) }

    private fun weekly(days: String, start: String) = Habit(
        name = "h",
        recurrenceType = HabitSchedule.TYPE_WEEKLY,
        startDate = start,
        weeklyDays = days
    )

    private fun monthly(days: String, start: String) = Habit(
        name = "h",
        recurrenceType = HabitSchedule.TYPE_MONTHLY,
        startDate = start,
        monthlyDays = days
    )

    private fun daily(start: String = "2026-09-01") = Habit(
        name = "h",
        recurrenceType = HabitSchedule.TYPE_DAILY,
        startDate = start
    )

    /** 报告用例 1：每周一三五，连续完成周一和周三 → 周三应显示 2，而不是 1 */
    @Test
    fun weeklyMonWedFri_countsScheduledOccurrencesNotNaturalDays() {
        val habit = weekly("1,3,5", "2026-09-14")
        val result = StreakCalculator.calculate(
            habit = habit,
            checkInsByDate = checkInsOn("2026-09-14", "2026-09-16"),
            referenceToday = LocalDate.of(2026, 9, 16) // 周三
        )
        assertEquals(2, result.currentStreak)
        assertEquals(2, result.longestStreak)
    }

    /** 报告用例 2：每周一，周四查看时周一已完成 → 应显示 1，而不是 0 */
    @Test
    fun weeklyMonday_streakSurvivesNonScheduledDays() {
        val habit = weekly("1", "2026-09-14")
        val result = StreakCalculator.calculate(
            habit = habit,
            checkInsByDate = checkInsOn("2026-09-14"),
            referenceToday = LocalDate.of(2026, 9, 17) // 周四，离周一已过 3 天
        )
        assertEquals(1, result.currentStreak)
    }

    /** 起始日之前的打卡不在排期内，不计入连续 */
    @Test
    fun checkInBeforeStartDateIsExcluded() {
        val habit = weekly("1", "2026-09-07")
        val result = StreakCalculator.calculate(
            habit = habit,
            checkInsByDate = checkInsOn("2026-08-31", "2026-09-07", "2026-09-14"),
            referenceToday = LocalDate.of(2026, 9, 17)
        )
        assertEquals(2, result.currentStreak)
    }

    /** 每周一连续三周都完成 → 3 */
    @Test
    fun weeklyMonday_threeConsecutiveWeeks() {
        // startDate 必须早于第一次打卡，否则起始日之前的记录不算排期内
        val habit = weekly("1", "2026-08-31")
        val result = StreakCalculator.calculate(
            habit = habit,
            checkInsByDate = checkInsOn("2026-08-31", "2026-09-07", "2026-09-14"),
            referenceToday = LocalDate.of(2026, 9, 17)
        )
        assertEquals(3, result.currentStreak)
        assertEquals(3, result.longestStreak)
    }

    /** 每周一漏掉最近一次 → 断签归零（不能因为「今天没排期」就误判为保持） */
    @Test
    fun weeklyMonday_missedLastOccurrenceResets() {
        val habit = weekly("1", "2026-09-07")
        val result = StreakCalculator.calculate(
            habit = habit,
            checkInsByDate = checkInsOn("2026-09-07"), // 09-14 那个周一没打卡
            referenceToday = LocalDate.of(2026, 9, 17)
        )
        assertEquals(0, result.currentStreak)
        assertEquals(1, result.longestStreak)
    }

    /** 每月 15 号：中间 29 天没有排期，不应打断连续 */
    @Test
    fun monthlyFixedDay_notBrokenByGapDays() {
        val habit = monthly("15", "2026-06-15")
        val result = StreakCalculator.calculate(
            habit = habit,
            checkInsByDate = checkInsOn("2026-07-15", "2026-08-15"),
            referenceToday = LocalDate.of(2026, 9, 10)
        )
        assertEquals(2, result.currentStreak)
    }

    /** 每日习惯：今天还没完成不算断签，从昨天往前数 */
    @Test
    fun daily_todayNotYetDoneGrace() {
        val habit = daily()
        val result = StreakCalculator.calculate(
            habit = habit,
            checkInsByDate = checkInsOn("2026-09-16", "2026-09-17"),
            referenceToday = LocalDate.of(2026, 9, 18)
        )
        assertEquals(2, result.currentStreak)
    }

    /** 每日习惯：昨天也没打卡 → 断签 */
    @Test
    fun daily_missedYesterdayResets() {
        val habit = daily()
        val result = StreakCalculator.calculate(
            habit = habit,
            checkInsByDate = checkInsOn("2026-09-15"),
            referenceToday = LocalDate.of(2026, 9, 18)
        )
        assertEquals(0, result.currentStreak)
    }

    /** 计数器习惯：次数没达到目标不算完成 */
    @Test
    fun counter_belowTargetDoesNotCount() {
        val habit = Habit(
            name = "water",
            recurrenceType = HabitSchedule.TYPE_DAILY,
            startDate = "2026-09-01",
            isCounter = true,
            targetCount = 3
        )
        val notEnough = mapOf(
            "2026-09-17" to CheckIn(habitId = 1, date = "2026-09-17", count = 2, isCompleted = false)
        )
        assertEquals(
            0,
            StreakCalculator.calculate(habit, notEnough, LocalDate.of(2026, 9, 17)).currentStreak
        )

        val enough = mapOf(
            "2026-09-17" to CheckIn(habitId = 1, date = "2026-09-17", count = 3, isCompleted = true)
        )
        assertEquals(
            1,
            StreakCalculator.calculate(habit, enough, LocalDate.of(2026, 9, 17)).currentStreak
        )
    }

    /** 未来的打卡记录不得计入统计 */
    @Test
    fun futureCheckInsAreIgnored() {
        val habit = daily()
        val result = StreakCalculator.calculate(
            habit = habit,
            checkInsByDate = checkInsOn("2026-09-17", "2026-09-25"), // 09-25 是未来
            referenceToday = LocalDate.of(2026, 9, 18)
        )
        assertEquals(1, result.currentStreak)
    }
}
