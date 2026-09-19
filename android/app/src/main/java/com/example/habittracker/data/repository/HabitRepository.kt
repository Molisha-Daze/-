package com.example.habittracker.data.repository

import android.content.Context
import com.example.habittracker.data.HabitDatabase
import com.example.habittracker.data.dao.CheckInWithHabit
import com.example.habittracker.data.entity.CheckIn
import com.example.habittracker.data.entity.Habit
import com.example.habittracker.data.entity.StandaloneCounter
import com.example.habittracker.model.DayProgress
import com.example.habittracker.model.HabitWithStats
import com.example.habittracker.notification.NotificationHelper
import com.example.habittracker.util.BackupCodec
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
    private val counterDao = db.standaloneCounterDao()

    /** 全部独立计数器，按最近更新排序。 */
    val allStandaloneCounters: Flow<List<StandaloneCounter>> = counterDao.getAllCounters()

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
            val checkInsByDate = habitCheckIns.associateBy { it.date }
            val todayCheckIn = checkInsByDate[todayStr]

            // 连续打卡按「有排期的日期」计算，周计划 / 月计划 / 间隔计划才不会被没排期的日子打断
            val streak = StreakCalculator.calculate(habit, checkInsByDate, todayDate)

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
        val habit = habitDao.getHabitById(habitId) ?: return null
        if (!canWrite(habit, date)) return null
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
        val habit = habitDao.getHabitById(habitId) ?: return null
        if (!canWrite(habit, date)) return null

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
        val habit = habitDao.getHabitById(habitId) ?: return null
        if (!canWrite(habit, date)) return null

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
        val habit = habitDao.getHabitById(habitId) ?: return
        if (!canWrite(habit, date)) return
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

    /**
     * 写入打卡记录的前置校验：
     * 1. 不得是未来日期
     * 2. 该日期必须在习惯的排期内——否则改了排期后，残留的通知 Action 或历史界面
     *    仍能在不该执行的日期写入完成记录
     */
    private fun canWrite(habit: Habit, date: String): Boolean =
        date <= DateUtils.today() && HabitSchedule.isScheduled(habit, date)

    // ---------- 独立计数器 ----------
    // 计数器是脱离排期的孤立实体，不参与 doze-redemption/热力图/连续天数，
    // 因此这里没有 Habit 那一套 canWrite 校验。

    suspend fun addCounter(counter: StandaloneCounter): Long = counterDao.insert(
        counter.copy(
            // 归一化：名称去空白、步长至少 1、单位兜底。
            // 与网页版 AddEditCounterModal.handleSubmit 的规则保持一致。
            name = counter.name.trim(),
            unit = counter.unit.trim().ifBlank { "次" },
            step = counter.step.coerceAtLeast(1),
            currentCount = counter.currentCount.coerceAtLeast(0),
            limitCount = if (counter.hasLimit) counter.limitCount?.coerceAtLeast(1) else null
        )
    )

    suspend fun updateCounter(counter: StandaloneCounter) {
        counterDao.update(
            counter.copy(
                name = counter.name.trim(),
                unit = counter.unit.trim().ifBlank { "次" },
                step = counter.step.coerceAtLeast(1),
                currentCount = counter.currentCount.coerceAtLeast(0),
                limitCount = if (counter.hasLimit) counter.limitCount?.coerceAtLeast(1) else null,
                updatedAt = System.currentTimeMillis()
            )
        )
    }

    suspend fun deleteCounter(id: Long) {
        counterDao.deleteById(id)
    }

    /**
     * 按 [delta] 增减计数。
     *
     * 走 DAO 里的 SQL 原子累加而非"读出 + 改 + 写回"，避免快速连点时的丢更新。
     * 下限由 SQL 的 MAX(0, ...) 保证；**上限不在此处拦截** —— 与网页版一致，
     * 允许超过上限并由 UI 显示"已达上限"，这样记录「多喝了一罐」这类情况不会被吞掉。
     */
    suspend fun stepCounter(id: Long, delta: Int) {
        counterDao.applyStep(id, delta)
    }

    /** 清零。 */
    suspend fun resetCounter(id: Long) {
        counterDao.setCount(id, 0)
    }

    // ---------- 备份与恢复 ----------

    /** 生成完整备份 JSON（含已归档习惯）。 */
    suspend fun exportBackupJson(): String = BackupCodec.exportToJson(
        BackupCodec.BackupData(
            habits = habitDao.getAllHabitsSync(),
            checkIns = checkInDao.getAllCheckInsSync(),
            counters = counterDao.getAllCountersSync()
        )
    )

    /**
     * 用备份文件**覆盖式**恢复当前数据。
     *
     * 为什么是覆盖而不是合并：习惯 id 与打卡记录通过外键绑定，局部合并很容易
     * 出现同一习惯两套 id 的冲突，用户很难预期结果。明确告诉用户"会覆盖"更安全。
     *
     * 顺序不可调换：
     * 1. 先清 check_ins 再清 habits（habits 的删除会 CASCADE 到 check_ins，显式清理避免歧义）；
     * 2. 写入时先 habits 后 check_ins —— Room 在事务里开启了 `foreign_keys=ON`，
     *    check_ins.habitId 引用不存在的 habit 会直接抛 FOREIGN KEY constraint failed。
     */
    suspend fun importBackupJson(json: String) {
        val data = BackupCodec.parse(json)
        checkInDao.deleteAll()
        habitDao.deleteAll()
        counterDao.deleteAll()

        data.habits.forEach { habitDao.insert(it) }
        data.checkIns.forEach { checkInDao.insert(it) }
        data.counters.forEach { counterDao.insert(it) }
    }
}
