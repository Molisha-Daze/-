package com.example.habittracker.ui.components

import android.Manifest
import android.app.DatePickerDialog
import android.app.TimePickerDialog
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Alarm
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.DirectionsBike
import androidx.compose.material.icons.filled.DirectionsRun
import androidx.compose.material.icons.filled.FitnessCenter
import androidx.compose.material.icons.filled.LocalDrink
import androidx.compose.material.icons.filled.Nightlight
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.SelfImprovement
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.example.habittracker.data.entity.Habit
import com.example.habittracker.notification.NotificationHelper
import com.example.habittracker.util.DateUtils
import com.example.habittracker.util.HabitSchedule
import java.time.LocalDate
import java.util.Calendar
import java.util.Locale

val PRESET_ICONS = listOf(
    "Star" to Icons.Default.Star,
    "Run" to Icons.Default.DirectionsRun,
    "Book" to Icons.Default.Book,
    "Water" to Icons.Default.LocalDrink,
    "Fitness" to Icons.Default.FitnessCenter,
    "Meditation" to Icons.Default.SelfImprovement,
    "Bike" to Icons.Default.DirectionsBike,
    "Sleep" to Icons.Default.Nightlight
)

val PRESET_COLORS = listOf(
    "#10B981" to "翡翠绿",
    "#3B82F6" to "海蓝色",
    "#8B5CF6" to "幻紫色",
    "#F59E0B" to "琥珀橙",
    "#EC4899" to "玫瑰粉",
    "#14B8A6" to "青碧色"
)

private val WEEKDAY_LABELS = listOf(
    1 to "一", 2 to "二", 3 to "三", 4 to "四", 5 to "五", 6 to "六", 7 to "日"
)

private val RECURRENCE_OPTIONS = listOf(
    HabitSchedule.TYPE_DAILY to "每天",
    HabitSchedule.TYPE_WEEKLY to "每周",
    HabitSchedule.TYPE_MONTHLY to "每月",
    HabitSchedule.TYPE_INTERVAL to "每N天",
    HabitSchedule.TYPE_NONE to "单次"
)

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun AddEditHabitDialog(
    initialHabit: Habit? = null,
    onDismiss: () -> Unit,
    onSave: (Habit) -> Unit
) {
    val context = LocalContext.current

    var name by remember { mutableStateOf(initialHabit?.name ?: "") }
    var selectedIcon by remember { mutableStateOf(initialHabit?.iconName ?: "Star") }
    var selectedColor by remember { mutableStateOf(initialHabit?.colorHex ?: "#10B981") }
    var reminderTime by remember { mutableStateOf(initialHabit?.reminderTime) }

    // 排期
    var recurrenceType by remember {
        mutableStateOf(initialHabit?.recurrenceType ?: HabitSchedule.DEFAULT_TYPE)
    }
    // 注意：老数据的 startDate 是空串，语义为「不限起始」。
    // 这里不能擅自填成今天，否则该习惯在开始日期之前的历史排期会全部消失。
    var startDate by remember { mutableStateOf(initialHabit?.startDate ?: DateUtils.today()) }
    var endDate by remember { mutableStateOf(initialHabit?.endDate?.takeIf { !it.isNullOrBlank() }) }
    var weeklyDays by remember { mutableStateOf(HabitSchedule.parseWeeklyDays(initialHabit?.weeklyDays)) }
    var monthlyDaysText by remember { mutableStateOf(initialHabit?.monthlyDays ?: "") }
    var intervalText by remember { mutableStateOf((initialHabit?.intervalDays ?: 2).toString()) }

    // 计数器
    var isCounter by remember { mutableStateOf(initialHabit?.isCounter ?: false) }
    var targetText by remember { mutableStateOf((initialHabit?.targetCount ?: 1).toString()) }
    var unit by remember { mutableStateOf(initialHabit?.unit ?: "次") }

    var errorText by remember { mutableStateOf<String?>(null) }
    var isNameError by remember { mutableStateOf(false) }

    // 精确定时能力：Android 12+ 上用户可以在系统设置里关掉，关掉后提醒会降级为非精确
    var exactAlarmAvailable by remember { mutableStateOf(NotificationHelper.canScheduleExactAlarms(context)) }

    val notificationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { _ -> }

    val exactAlarmSettingsLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) {
        // 从系统精确定时设置页返回后才刷新，避免「系统未允许精确提醒」的提示滞留
        exactAlarmAvailable = NotificationHelper.canScheduleExactAlarms(context)
    }

    // 兜底：用户通过其他路径切走再回来（例如从最近任务切回）时也刷新一次
    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                exactAlarmAvailable = NotificationHelper.canScheduleExactAlarms(context)
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val granted = ContextCompat.checkSelfPermission(
                context, Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
            if (!granted) notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    fun commit() {
        when {
            name.isBlank() -> {
                isNameError = true
                errorText = "请输入习惯名称"
            }
            recurrenceType == HabitSchedule.TYPE_WEEKLY && weeklyDays.isEmpty() -> {
                errorText = "请选择至少一天"
            }
            recurrenceType == HabitSchedule.TYPE_MONTHLY &&
                HabitSchedule.parseMonthlyDays(monthlyDaysText).isEmpty() -> {
                errorText = "请输入 1-31 之间的日期，多个用逗号分隔，如 1,15,28"
            }
            recurrenceType == HabitSchedule.TYPE_INTERVAL &&
                (intervalText.trim().toIntOrNull() ?: 0) < 1 -> {
                errorText = "间隔天数至少为 1"
            }
            recurrenceType == HabitSchedule.TYPE_NONE && startDate.isBlank() -> {
                errorText = "单次习惯请选择具体日期"
            }
            // startDate 为空表示「不限起始」，此时不做上下界比较
            endDate != null && startDate.isNotBlank() && endDate!! < startDate -> {
                errorText = "结束日期不能早于开始日期"
            }
            isCounter && (targetText.trim().toIntOrNull() ?: 0) < 1 -> {
                errorText = "目标次数至少为 1"
            }
            else -> {
                val base = initialHabit ?: Habit(name = "")
                onSave(
                    base.copy(
                        name = name.trim(),
                        iconName = selectedIcon,
                        colorHex = selectedColor,
                        reminderTime = reminderTime,
                        startDate = startDate,
                        endDate = endDate,
                        recurrenceType = recurrenceType,
                        weeklyDays = if (recurrenceType == HabitSchedule.TYPE_WEEKLY)
                            HabitSchedule.formatWeeklyDays(weeklyDays) else null,
                        monthlyDays = if (recurrenceType == HabitSchedule.TYPE_MONTHLY)
                            HabitSchedule.formatMonthlyDays(HabitSchedule.parseMonthlyDays(monthlyDaysText))
                        else null,
                        intervalDays = if (recurrenceType == HabitSchedule.TYPE_INTERVAL)
                            intervalText.trim().toIntOrNull() ?: 1 else 1,
                        isCounter = isCounter,
                        targetCount = if (isCounter) targetText.trim().toIntOrNull() ?: 1 else 1,
                        unit = if (isCounter) unit.trim().ifBlank { "次" } else "次"
                    )
                )
                onDismiss()
            }
        }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = if (initialHabit == null) "新建习惯项目" else "编辑习惯项目",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
            ) {
                // Name
                OutlinedTextField(
                    value = name,
                    onValueChange = {
                        name = it
                        if (it.isNotBlank()) isNameError = false
                    },
                    label = { Text("习惯名称 (如：晨跑、阅读)") },
                    isError = isNameError,
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(modifier = Modifier.height(16.dp))

                SectionLabel("选择图标")
                Spacer(modifier = Modifier.height(8.dp))
                FlowRow(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    PRESET_ICONS.forEach { (iconKey, vector) ->
                        val isSelected = selectedIcon == iconKey
                        val tintColor = parseColorSafe(selectedColor, MaterialTheme.colorScheme.primary)
                        Box(
                            modifier = Modifier
                                .size(44.dp)
                                .clip(CircleShape)
                                .background(if (isSelected) tintColor.copy(alpha = 0.2f) else MaterialTheme.colorScheme.surfaceVariant)
                                .border(
                                    width = if (isSelected) 2.dp else 1.dp,
                                    color = if (isSelected) tintColor else Color.Transparent,
                                    shape = CircleShape
                                )
                                .clickable { selectedIcon = iconKey },
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = vector,
                                contentDescription = iconKey,
                                tint = if (isSelected) tintColor else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                SectionLabel("选择主题色")
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    PRESET_COLORS.forEach { (colorHex, _) ->
                        val isSelected = selectedColor == colorHex
                        val parsedColor = parseColorSafe(colorHex, MaterialTheme.colorScheme.primary)
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(parsedColor)
                                .border(
                                    width = if (isSelected) 3.dp else 0.dp,
                                    color = if (isSelected) MaterialTheme.colorScheme.onSurface else Color.Transparent,
                                    shape = CircleShape
                                )
                                .clickable { selectedColor = colorHex }
                        )
                    }
                }

                Spacer(modifier = Modifier.height(18.dp))

                // 重复方式
                SectionLabel("重复方式")
                Spacer(modifier = Modifier.height(8.dp))
                FlowRow(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    RECURRENCE_OPTIONS.forEach { (type, label) ->
                        FilterChip(
                            selected = recurrenceType == type,
                            onClick = { recurrenceType = type },
                            label = { Text(label) },
                            shape = RoundedCornerShape(10.dp),
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = MaterialTheme.colorScheme.primaryContainer,
                                selectedLabelColor = MaterialTheme.colorScheme.onPrimaryContainer
                            )
                        )
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                when (recurrenceType) {
                    HabitSchedule.TYPE_WEEKLY -> {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            WEEKDAY_LABELS.forEach { (value, label) ->
                                val picked = weeklyDays.contains(value)
                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(
                                            if (picked) MaterialTheme.colorScheme.primary
                                            else MaterialTheme.colorScheme.surfaceVariant
                                        )
                                        .clickable {
                                            weeklyDays = if (picked) weeklyDays - value else weeklyDays + value
                                        }
                                        .padding(vertical = 8.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = label,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = if (picked) MaterialTheme.colorScheme.onPrimary
                                        else MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }
                    }

                    HabitSchedule.TYPE_MONTHLY -> {
                        OutlinedTextField(
                            value = monthlyDaysText,
                            onValueChange = { monthlyDaysText = it },
                            label = { Text("每月哪几天，如 1,15,28") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp)
                        )
                    }

                    HabitSchedule.TYPE_INTERVAL -> {
                        OutlinedTextField(
                            value = intervalText,
                            onValueChange = { intervalText = it },
                            label = { Text("每几天一次") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp)
                        )
                    }

                    HabitSchedule.TYPE_NONE -> {
                        Text(
                            text = "单次习惯只在开始日期当天出现",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // 生效区间
                SectionLabel("生效区间")
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    DatePickerButton(
                        value = startDate,
                        modifier = Modifier.weight(1f),
                        onValueChange = { startDate = it }
                    )
                    Text("→", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    if (endDate == null) {
                        OutlinedButton(
                            onClick = {
                                endDate = if (startDate.isBlank()) DateUtils.today() else startDate
                            },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text("结束日期(可选)")
                        }
                    } else {
                        DatePickerButton(
                            value = endDate!!,
                            modifier = Modifier.weight(1f),
                            onValueChange = { endDate = it },
                            onClear = { endDate = null }
                        )
                    }
                }

                Spacer(modifier = Modifier.height(18.dp))

                // 计数器
                SectionLabel("计数器")
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "按次数累计（如喝水 3 杯）",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.weight(1f)
                    )
                    Switch(checked = isCounter, onCheckedChange = { isCounter = it })
                }

                if (isCounter) {
                    Spacer(modifier = Modifier.height(10.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        OutlinedTextField(
                            value = targetText,
                            onValueChange = { targetText = it },
                            label = { Text("目标次数") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            singleLine = true,
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp)
                        )
                        OutlinedTextField(
                            value = unit,
                            onValueChange = { unit = it },
                            label = { Text("单位") },
                            singleLine = true,
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(18.dp))

                // 提醒时间
                SectionLabel("每日提醒")
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    OutlinedButton(
                        onClick = {
                            val cal = Calendar.getInstance()
                            val curHour = reminderTime?.split(":")?.getOrNull(0)?.toIntOrNull()
                                ?: cal.get(Calendar.HOUR_OF_DAY)
                            val curMinute = reminderTime?.split(":")?.getOrNull(1)?.toIntOrNull()
                                ?: cal.get(Calendar.MINUTE)

                            TimePickerDialog(
                                context,
                                { _, hour, minute ->
                                    reminderTime = String.format("%02d:%02d", hour, minute)
                                    // 在用户真正设置提醒的这一刻再请求通知权限，比冷启动时硬要更容易被接受
                                    requestNotificationPermissionIfNeeded()
                                },
                                curHour,
                                curMinute,
                                true
                            ).show()
                        },
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Icon(Icons.Default.Alarm, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(text = reminderTime?.let { "提醒时间: $it" } ?: "设置每日提醒时间")
                    }

                    if (reminderTime != null) {
                        Spacer(modifier = Modifier.width(8.dp))
                        TextButton(onClick = { reminderTime = null }) {
                            Text("清除提醒")
                        }
                    }
                }

                // 精确定时被系统关闭时明确告知，而不是静默降级
                if (reminderTime != null && !exactAlarmAvailable) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "系统未允许精确提醒，提醒可能延迟数分钟",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.error,
                            modifier = Modifier.weight(1f)
                        )
                        TextButton(onClick = {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                                // 必须走 Activity Result：等用户从系统设置返回后再查询，
                                // 而不是 startActivity 之后立刻查询（那样查到的还是旧状态）
                                exactAlarmSettingsLauncher.launch(
                                    Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
                                        data = Uri.parse("package:${context.packageName}")
                                    }
                                )
                            }
                        }) {
                            Text("去设置")
                        }
                    }
                }

                if (errorText != null) {
                    Spacer(modifier = Modifier.height(10.dp))
                    Text(
                        text = errorText!!,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { commit() },
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = parseColorSafe(selectedColor, MaterialTheme.colorScheme.primary)
                )
            ) {
                Text("保存", color = Color.White)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("取消")
            }
        }
    )
}

@Composable
private fun SectionLabel(text: String) {
    Text(
        text = text,
        style = MaterialTheme.typography.labelLarge,
        color = MaterialTheme.colorScheme.onSurface
    )
}

@Composable
private fun DatePickerButton(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    onClear: (() -> Unit)? = null
) {
    val context = LocalContext.current
    val parsed = remember(value) {
        runCatching { LocalDate.parse(value) }.getOrNull() ?: LocalDate.now()
    }
    // 空串表示「不限起始」，不能显示成空白或今天的日期
    val display = if (value.isBlank()) "不限" else value
    Row(modifier = modifier, verticalAlignment = Alignment.CenterVertically) {
        OutlinedButton(
            onClick = {
                DatePickerDialog(
                    context,
                    { _, year, month, day ->
                        onValueChange(String.format(Locale.getDefault(), "%04d-%02d-%02d", year, month + 1, day))
                    },
                    parsed.year,
                    parsed.monthValue - 1,
                    parsed.dayOfMonth
                ).show()
            },
            shape = RoundedCornerShape(10.dp),
            modifier = Modifier.weight(1f)
        ) {
            Icon(Icons.Default.DateRange, contentDescription = null, modifier = Modifier.size(16.dp))
            Spacer(modifier = Modifier.width(4.dp))
            Text(display, style = MaterialTheme.typography.bodySmall)
        }
        if (onClear != null) {
            IconButton(onClick = onClear, modifier = Modifier.size(32.dp)) {
                Icon(
                    Icons.Default.Remove,
                    contentDescription = "清除",
                    tint = MaterialTheme.colorScheme.error,
                    modifier = Modifier.size(16.dp)
                )
            }
        }
    }
}

internal fun parseColorSafe(colorHex: String, fallback: Color): Color =
    try {
        Color(android.graphics.Color.parseColor(colorHex))
    } catch (e: Exception) {
        fallback
    }

/** 本 App 的系统通知设置页 Intent（供 StartActivityForResult 使用，便于返回后重新检查权限）。 */
internal fun notificationSettingsIntent(context: Context): Intent =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
            putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
        }
    } else {
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
            data = Uri.parse("package:${context.packageName}")
        }
    }.apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }

/** 打开本 App 的系统通知设置页。 */
internal fun openAppNotificationSettings(context: Context) {
    context.startActivity(notificationSettingsIntent(context))
}
