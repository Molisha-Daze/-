package com.example.habittracker.util

import java.time.LocalDate

data class StreakResult(
    val currentStreak: Int,
    val longestStreak: Int
)

object StreakCalculator {

    /**
     * Calculates current and longest streaks based on local natural days (midnight boundary).
     * @param checkInDates set of unique "yyyy-MM-dd" date strings for a habit
     * @param referenceToday today's date in the user's local timezone
     */
    fun calculate(
        checkInDates: Set<String>,
        referenceToday: LocalDate = DateUtils.todayDate()
    ): StreakResult {
        if (checkInDates.isEmpty()) {
            return StreakResult(currentStreak = 0, longestStreak = 0)
        }

        // Convert and sort all dates
        val localDates = checkInDates
            .mapNotNull {
                try {
                    DateUtils.parseDate(it)
                } catch (e: Exception) {
                    null
                }
            }
            .distinct()
            .sorted()

        if (localDates.isEmpty()) {
            return StreakResult(currentStreak = 0, longestStreak = 0)
        }

        // Calculate Longest Streak
        var maxStreak = 1
        var tempStreak = 1
        for (i in 1 until localDates.size) {
            val prev = localDates[i - 1]
            val curr = localDates[i]
            if (curr == prev.plusDays(1)) {
                tempStreak++
                if (tempStreak > maxStreak) {
                    maxStreak = tempStreak
                }
            } else if (curr != prev) {
                tempStreak = 1
            }
        }

        // Calculate Current Streak
        val todayStr = DateUtils.formatDate(referenceToday)
        val yesterdayStr = DateUtils.formatDate(referenceToday.minusDays(1))

        val isCheckedToday = checkInDates.contains(todayStr)
        val isCheckedYesterday = checkInDates.contains(yesterdayStr)

        val currentStreak = when {
            isCheckedToday -> {
                // Count backwards from today
                var count = 0
                var checkDate = referenceToday
                while (checkInDates.contains(DateUtils.formatDate(checkDate))) {
                    count++
                    checkDate = checkDate.minusDays(1)
                }
                count
            }
            isCheckedYesterday -> {
                // Today not yet checked in, but streak is still intact from yesterday
                var count = 0
                var checkDate = referenceToday.minusDays(1)
                while (checkInDates.contains(DateUtils.formatDate(checkDate))) {
                    count++
                    checkDate = checkDate.minusDays(1)
                }
                count
            }
            else -> {
                // Neither today nor yesterday was checked in -> streak is broken, resets to 0
                0
            }
        }

        return StreakResult(
            currentStreak = currentStreak,
            longestStreak = maxOf(maxStreak, currentStreak)
        )
    }
}
