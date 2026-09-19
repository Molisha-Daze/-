package com.example.habittracker.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.habittracker.data.entity.CheckIn
import com.example.habittracker.data.entity.Habit
import com.example.habittracker.util.HabitSchedule
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.DateTimeFormatter

/**
 * 细化月视图日历网格组件 (Compose):
 * 1. 周一为每周第一天
 * 2. 顶部月份切换，但不允许翻到未来月份
 * 3. 每个日期格显示日期数字，若当天有排期计划，下方显示小圆点（全完成=实心绿点，未完成=空心灰点）
 * 4. 点击日期选中，下方实时联动显示该日期的计划列表，带勾选框与删除线效果
 * 5. 未来日期一律只读，不允许「提前完成」
 */
@Composable
fun CalendarMonthView(
    habits: List<Habit>,
    checkIns: List<CheckIn>,
    onToggleCheckIn: (habitId: Long, date: String) -> Unit,
    onIncrement: (habitId: Long, date: String) -> Unit,
    onDecrement: (habitId: Long, date: String) -> Unit,
    modifier: Modifier = Modifier
) {
    val today = LocalDate.now()
    var currentMonth by remember { mutableStateOf(YearMonth.now()) }
    var selectedDate by remember { mutableStateOf(today) }

    // 切月后 selectedDate 可能还停留在另一个月，导致网格高亮的和下方清单显示的不是同一天。
    // 这里把它夹回当前可见月份。
    val effectiveSelectedDate = remember(selectedDate, currentMonth) {
        if (YearMonth.from(selectedDate) == currentMonth) {
            selectedDate
        } else {
            currentMonth.atDay(selectedDate.dayOfMonth.coerceAtMost(currentMonth.lengthOfMonth()))
        }
    }

    val checkInsByDateAndHabit = remember(checkIns) {
        checkIns.associateBy { "${it.date}_${it.habitId}" }
    }

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Month Switcher Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = { currentMonth = currentMonth.minusMonths(1) }) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "上一月",
                        tint = MaterialTheme.colorScheme.onSurface
                    )
                }

                Text(
                    text = "${currentMonth.year} 年 ${currentMonth.monthValue} 月",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )

                // 不允许翻到未来月份：未来日期没有「补打卡」的意义
                IconButton(
                    onClick = { currentMonth = currentMonth.plusMonths(1) },
                    enabled = currentMonth < YearMonth.now()
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                        contentDescription = "下一月",
                        tint = if (currentMonth < YearMonth.now()) MaterialTheme.colorScheme.onSurface
                        else MaterialTheme.colorScheme.outline
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Weekday Headers (Monday first: 一 二 三 四 五 六 日)
            val weekDays = listOf("一", "二", "三", "四", "五", "六", "日")
            Row(modifier = Modifier.fillMaxWidth()) {
                weekDays.forEach { label ->
                    Text(
                        text = label,
                        modifier = Modifier.weight(1f),
                        textAlign = TextAlign.Center,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            // Grid calculation: Monday is first day
            val firstDayOfMonth = currentMonth.atDay(1)
            val daysInMonth = currentMonth.lengthOfMonth()
            // DayOfWeek: 1 = Monday, 7 = Sunday
            val leadEmptyDays = firstDayOfMonth.dayOfWeek.value - 1
            val totalCells = ((leadEmptyDays + daysInMonth + 6) / 7) * 7

            for (row in 0 until totalCells / 7) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                    for (col in 0..6) {
                        val cellIndex = row * 7 + col
                        val dayNumber = cellIndex - leadEmptyDays + 1

                        if (dayNumber in 1..daysInMonth) {
                            val dateObj = currentMonth.atDay(dayNumber)
                            val dateStr = dateObj.format(DateTimeFormatter.ISO_LOCAL_DATE)
                            val isSelected = dateObj == effectiveSelectedDate
                            val isToday = dateObj == today
                            val isFuture = dateObj > today

                            // Check habits scheduled on this date
                            val scheduledHabits = habits.filter { habit ->
                                HabitSchedule.isScheduled(habit, dateObj)
                            }
                            val hasScheduled = scheduledHabits.isNotEmpty()
                            val completedHabits = scheduledHabits.filter { habit ->
                                HabitSchedule.isCompleted(
                                    habit,
                                    checkInsByDateAndHabit["${dateStr}_${habit.id}"]
                                )
                            }
                            val isAllCompleted = hasScheduled && completedHabits.size == scheduledHabits.size

                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .aspectRatio(1f)
                                    .padding(2.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(
                                        when {
                                            isSelected -> MaterialTheme.colorScheme.primaryContainer
                                            isToday -> MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                                            else -> Color.Transparent
                                        }
                                    )
                                    .clickable(enabled = !isFuture) { selectedDate = dateObj },
                                contentAlignment = Alignment.Center
                            ) {
                                Column(
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.Center
                                ) {
                                    Text(
                                        text = "$dayNumber",
                                        fontSize = 12.sp,
                                        fontWeight = if (isToday || isSelected) FontWeight.Bold else FontWeight.Normal,
                                        color = when {
                                            isFuture -> MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.38f)
                                            isSelected -> MaterialTheme.colorScheme.onPrimaryContainer
                                            else -> MaterialTheme.colorScheme.onSurface
                                        }
                                    )

                                    if (hasScheduled) {
                                        Spacer(modifier = Modifier.height(2.dp))
                                        // Dot: solid green if completed, hollow gray if incomplete
                                        Box(
                                            modifier = Modifier
                                                .size(5.dp)
                                                .clip(CircleShape)
                                                .background(
                                                    if (isAllCompleted) Color(0xFF10B981) else Color.Transparent
                                                )
                                                .border(
                                                    width = 1.dp,
                                                    color = if (isAllCompleted) Color(0xFF10B981) else Color(0xFF9CA3AF),
                                                    shape = CircleShape
                                                )
                                        )
                                    } else {
                                        Spacer(modifier = Modifier.height(7.dp))
                                    }
                                }
                            }
                        } else {
                            // Blank cell for leading or trailing days
                            Box(modifier = Modifier.weight(1f).aspectRatio(1f))
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Below Calendar: Selected day plans checklist
            val selectedDateStr = effectiveSelectedDate.format(DateTimeFormatter.ISO_LOCAL_DATE)
            val selectedDayHabits = habits.filter { HabitSchedule.isScheduled(it, effectiveSelectedDate) }
            val selectedIsFuture = effectiveSelectedDate > today

            Text(
                text = "${effectiveSelectedDate.year}年${effectiveSelectedDate.monthValue}月${effectiveSelectedDate.dayOfMonth}日 计划清单 (${selectedDayHabits.size} 项)",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )

            if (selectedIsFuture) {
                Text(
                    text = "未来日期暂不可打卡",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            if (selectedDayHabits.isEmpty()) {
                Text(
                    text = "所选日期未安排打卡计划",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(vertical = 8.dp)
                )
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    selectedDayHabits.forEach { habit ->
                        val checkIn = checkInsByDateAndHabit["${selectedDateStr}_${habit.id}"]
                        val isDone = HabitSchedule.isCompleted(habit, checkIn)
                        val count = HabitSchedule.currentCount(checkIn)
                        val target = HabitSchedule.effectiveTarget(habit)

                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f))
                                .then(
                                    if (selectedIsFuture) Modifier
                                    else Modifier.clickable {
                                        if (habit.isCounter) {
                                            if (count < target) onIncrement(habit.id, selectedDateStr) else onDecrement(habit.id, selectedDateStr)
                                        } else {
                                            onToggleCheckIn(habit.id, selectedDateStr)
                                        }
                                    }
                                )
                                .padding(horizontal = 8.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            if (habit.isCounter) {
                                IconButton(
                                    onClick = { onDecrement(habit.id, selectedDateStr) },
                                    enabled = !selectedIsFuture && count > 0,
                                    modifier = Modifier.size(30.dp)
                                ) {
                                    Icon(
                                        Icons.Default.Remove,
                                        contentDescription = "减一次",
                                        tint = if (!selectedIsFuture && count > 0) MaterialTheme.colorScheme.primary
                                        else MaterialTheme.colorScheme.outline,
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                                Text(
                                    text = "$count/$target",
                                    style = MaterialTheme.typography.bodySmall,
                                    fontWeight = FontWeight.SemiBold,
                                    color = if (isDone) Color(0xFF10B981) else MaterialTheme.colorScheme.onSurface
                                )
                                IconButton(
                                    onClick = { onIncrement(habit.id, selectedDateStr) },
                                    enabled = !selectedIsFuture && count < target,
                                    modifier = Modifier.size(30.dp)
                                ) {
                                    Icon(
                                        Icons.Default.Add,
                                        contentDescription = "加一次",
                                        tint = if (!selectedIsFuture && count < target) MaterialTheme.colorScheme.primary
                                        else MaterialTheme.colorScheme.outline,
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                            } else {
                                Checkbox(
                                    checked = isDone,
                                    onCheckedChange = {
                                        if (!selectedIsFuture) onToggleCheckIn(habit.id, selectedDateStr)
                                    },
                                    enabled = !selectedIsFuture,
                                    colors = CheckboxDefaults.colors(checkedColor = Color(0xFF10B981))
                                )
                            }

                            Spacer(modifier = Modifier.width(4.dp))

                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = habit.name,
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.SemiBold,
                                    color = if (isDone) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface,
                                    textDecoration = if (isDone) TextDecoration.LineThrough else TextDecoration.None
                                )

                                if (habit.isCounter) {
                                    Text(
                                        text = "目标: $target ${habit.unit}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        fontSize = 11.sp
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
