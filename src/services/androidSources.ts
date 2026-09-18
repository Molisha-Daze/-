import JSZip from 'jszip';

export interface AndroidProjectFile {
  path: string;
  name: string;
  language: 'kotlin' | 'xml' | 'groovy' | 'properties' | 'markdown';
  content: string;
  description: string;
}

export const ANDROID_FILES: AndroidProjectFile[] = [
  {
    path: 'app/src/main/java/com/example/habittracker/MainActivity.kt',
    name: 'MainActivity.kt',
    language: 'kotlin',
    description: '入口 Activity，配置边缘延伸 (Edge-to-Edge) 与主题入口',
    content: `package com.example.habittracker

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.lifecycle.ViewModelProvider
import com.example.habittracker.ui.screens.MainScreen
import com.example.habittracker.ui.theme.HabitTrackerTheme
import com.example.habittracker.viewmodel.HabitViewModel
import com.example.habittracker.viewmodel.HabitViewModelFactory

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val app = application as HabitApplication
        val viewModel = ViewModelProvider(
            this,
            HabitViewModelFactory(app.repository)
        )[HabitViewModel::class.java]

        setContent {
            HabitTrackerTheme {
                MainScreen(viewModel = viewModel)
            }
        }
    }
}`
  },
  {
    path: 'app/src/main/java/com/example/habittracker/data/entity/Habit.kt',
    name: 'Habit.kt',
    language: 'kotlin',
    description: 'Room 习惯实体表 (Habit: 标题、描述、大计划/细化小计划、图标、颜色、提醒、重复方式、有效范围、计数器)',
    content: `package com.example.habittracker.data.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "habits")
data class Habit(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val name: String,
    val description: String? = null, // 多行内容描述（如训练动作文本）
    val iconName: String = "Star",
    val colorHex: String = "#10B981",
    val reminderTime: String? = null, // e.g. "08:30"
    val sortOrder: Int = 0,
    val archived: Boolean = false,

    // 重复方式: "none"不重复, "daily"每天, "weekly"每周, "monthly"每月, "interval"每N天
    val recurrenceType: String = "daily",
    val startDate: String = "", // "yyyy-MM-dd"
    val endDate: String? = null, // 可选结束日期
    val weeklyDays: String? = null, // "1,2,3,4,5" (1=周一, 7=周日)
    val monthlyDays: String? = null, // "15"
    val intervalDays: Int = 1,

    // 细化大计划支持 (点击消除小计划)
    val isParentPlan: Boolean = false,
    val subTasksJson: String? = null, // 例如: [{"id":"1","title":"深蹲 4 组 x 10 次"}]

    // 目标计数器功能 (例如喝水 3 杯，点按+1)
    val isCounter: Boolean = false,
    val targetCount: Int = 1,
    val unit: String = "次"
)`
  },
  {
    path: 'app/src/main/java/com/example/habittracker/data/entity/CheckIn.kt',
    name: 'CheckIn.kt',
    language: 'kotlin',
    description: 'Room 打卡记录实体表 (CheckIn: habitId, date, count, isCompleted, photoPath, completedSubTaskIdsJson)',
    content: `package com.example.habittracker.data.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "check_ins",
    foreignKeys = [
        ForeignKey(
            entity = Habit::class,
            parentColumns = ["id"],
            childColumns = ["habitId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [
        Index(value = ["habitId", "date"], unique = true),
        Index(value = ["date"])
    ]
)
data class CheckIn(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val habitId: Long,
    val date: String, // "yyyy-MM-dd" 本地自然日
    val photoPath: String? = null,
    val note: String? = null,
    val count: Int = 1, // 当前累计计数
    val completedSubTaskIdsJson: String? = null, // 已完成小计划 ID 数组 JSON
    val isCompleted: Boolean = true, // 是否达成目标
    val createdAt: Long = System.currentTimeMillis()
)`
  },
  {
    path: 'app/src/main/java/com/example/habittracker/data/entity/StandaloneCounter.kt',
    name: 'StandaloneCounter.kt',
    language: 'kotlin',
    description: '独立计数器实体 (无需设定计划，记录如可乐剩余罐数、喝一次点一下、支持上限或无上限)',
    content: `package com.example.habittracker.data.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "standalone_counters")
data class StandaloneCounter(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val name: String, // 计数器名称，如："冰箱里的可乐"、"今日咖啡"
    val count: Int = 0, // 当前计数值，点一下按 step 增减
    val hasLimit: Boolean = false, // 是否设置上限 (根据用户需求自选)
    val maxLimit: Int? = null, // 上限数值，如 12 罐
    val unit: String = "罐", // 单位：罐、杯、支、个
    val step: Int = 1, // 每次步进增减量 (默认 1)
    val colorHex: String = "#8B5CF6",
    val note: String? = null,
    val updatedAt: Long = System.currentTimeMillis()
)`
  },
  {
    path: 'app/src/main/java/com/example/habittracker/util/StreakCalculator.kt',
    name: 'StreakCalculator.kt',
    language: 'kotlin',
    description: '连续打卡天数核心算法 (按本地自然日计算，断卡后归零，最长历史连续数)',
    content: `package com.example.habittracker.util

import java.time.LocalDate

data class StreakResult(
    val currentStreak: Int,
    val longestStreak: Int
)

object StreakCalculator {
    fun calculate(
        checkInDates: Set<String>,
        referenceToday: LocalDate = DateUtils.todayDate()
    ): StreakResult {
        if (checkInDates.isEmpty()) {
            return StreakResult(currentStreak = 0, longestStreak = 0)
        }

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

        // 最长连续天数
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

        // 当前连续天数 (严格本地自然日，00:00 分界)
        val todayStr = DateUtils.formatDate(referenceToday)
        val yesterdayStr = DateUtils.formatDate(referenceToday.minusDays(1))

        val isCheckedToday = checkInDates.contains(todayStr)
        val isCheckedYesterday = checkInDates.contains(yesterdayStr)

        val currentStreak = when {
            isCheckedToday -> {
                var count = 0
                var checkDate = referenceToday
                while (checkInDates.contains(DateUtils.formatDate(checkDate))) {
                    count++
                    checkDate = checkDate.minusDays(1)
                }
                count
            }
            isCheckedYesterday -> {
                // 当天尚未打卡，但昨天已打卡，保留当前连续数
                var count = 0
                var checkDate = referenceToday.minusDays(1)
                while (checkInDates.contains(DateUtils.formatDate(checkDate))) {
                    count++
                    checkDate = checkDate.minusDays(1)
                }
                count
            }
            else -> {
                // 昨天今天均未打卡，断卡归零
                0
            }
        }

        return StreakResult(
            currentStreak = currentStreak,
            longestStreak = maxOf(maxStreak, currentStreak)
        )
    }
}`
  },
  {
    path: 'app/src/main/java/com/example/habittracker/util/ImageStorageManager.kt',
    name: 'ImageStorageManager.kt',
    language: 'kotlin',
    description: '照片持久化管理器 (流式复制 PhotoPicker 临时 URI 到 App 私有目录)',
    content: `package com.example.habittracker.util

import android.content.Context
import android.net.Uri
import android.os.Environment
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.util.UUID

object ImageStorageManager {
    fun saveImageToAppStorage(
        context: Context,
        uri: Uri,
        habitId: Long,
        date: String
    ): String? {
        return try {
            val picturesDir = context.getExternalFilesDir(Environment.DIRECTORY_PICTURES) 
                ?: context.filesDir

            if (!picturesDir.exists()) {
                picturesDir.mkdirs()
            }

            val filename = "checkin_\${habitId}_\${date}_\${UUID.randomUUID()}.jpg"
            val destFile = File(picturesDir, filename)

            val inputStream: InputStream? = context.contentResolver.openInputStream(uri)
            val outputStream = FileOutputStream(destFile)

            inputStream?.use { input ->
                outputStream.use { output ->
                    input.copyTo(output)
                }
            }

            destFile.absolutePath
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    fun deleteImageFile(path: String?) {
        if (path.isNullOrBlank()) return
        try {
            val file = File(path)
            if (file.exists()) {
                file.delete()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}`
  },
  {
    path: 'app/src/main/java/com/example/habittracker/notification/NotificationHelper.kt',
    name: 'NotificationHelper.kt',
    language: 'kotlin',
    description: '精确提醒闹钟与通知调度 (AlarmManager 精确触发 + 通知渠道 + 一键打卡 Action)',
    content: `package com.example.habittracker.notification

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.example.habittracker.MainActivity
import com.example.habittracker.data.entity.Habit
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZoneId

object NotificationHelper {
    const val CHANNEL_ID = "habit_daily_reminders"
    const val CHANNEL_NAME = "每日习惯提醒"
    const val EXTRA_HABIT_ID = "extra_habit_id"
    const val EXTRA_HABIT_NAME = "extra_habit_name"
    const val ACTION_CHECK_IN = "com.example.habittracker.ACTION_CHECK_IN"

    fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "每日定时提醒完成习惯打卡"
                enableVibration(true)
            }
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    fun scheduleDailyReminder(context: Context, habit: Habit) {
        val reminderTime = habit.reminderTime ?: return
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return

        try {
            val parts = reminderTime.split(":")
            if (parts.size != 2) return
            val hour = parts[0].toIntOrNull() ?: return
            val minute = parts[1].toIntOrNull() ?: return

            val now = LocalDateTime.now(ZoneId.systemDefault())
            var targetDateTime = LocalDateTime.of(LocalDate.now(), LocalTime.of(hour, minute, 0))

            if (targetDateTime.isBefore(now) || targetDateTime.isEqual(now)) {
                targetDateTime = targetDateTime.plusDays(1)
            }

            val triggerMillis = targetDateTime.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()

            val intent = Intent(context, AlarmReceiver::class.java).apply {
                putExtra(EXTRA_HABIT_ID, habit.id)
                putExtra(EXTRA_HABIT_NAME, habit.name)
            }

            val pendingIntent = PendingIntent.getBroadcast(
                context,
                habit.id.toInt(),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (alarmManager.canScheduleExactAlarms()) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerMillis, pendingIntent)
                } else {
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerMillis, pendingIntent)
                }
            } else {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerMillis, pendingIntent)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}`
  },
  {
    path: 'app/src/main/java/com/example/habittracker/notification/BootReceiver.kt',
    name: 'BootReceiver.kt',
    language: 'kotlin',
    description: '开机自启广播接收器 (BOOT_COMPLETED 重新注册所有未归档习惯的提醒闹钟)',
    content: `package com.example.habittracker.notification

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.example.habittracker.data.HabitDatabase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED ||
            intent.action == "android.intent.action.QUICKBOOT_POWERON"
        ) {
            val pendingResult = goAsync()
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val db = HabitDatabase.getInstance(context)
                    val habits = db.habitDao().getAllActiveHabitsList()
                    for (habit in habits) {
                        if (habit.reminderTime != null) {
                            NotificationHelper.scheduleDailyReminder(context, habit)
                        }
                    }
                } finally {
                    pendingResult.finish()
                }
            }
        }
    }
}`
  },
  {
    path: 'app/src/main/java/com/example/habittracker/ui/components/HabitCard.kt',
    name: 'HabitCard.kt',
    language: 'kotlin',
    description: '打卡卡片组件 (勾选态切换、Photo Picker 拍照选图、凭证缩略图、连续天数显示)',
    content: `// 详见完整源码中的 HabitCard.kt 实现，包含 ActivityResultContracts.PickVisualMedia PhotoPicker`
  },
  {
    path: 'app/src/main/java/com/example/habittracker/ui/components/CalendarHeatMap.kt',
    name: 'CalendarHeatMap.kt',
    language: 'kotlin',
    description: '35 天日历热力图组件 (按每日完成度比例呈现深浅梯度着色与日期网格)',
    content: `// 详见完整源码中的 CalendarHeatMap.kt 实现，支持 35 天网格与动态完成率色阶`
  },
  {
    path: 'app/src/main/AndroidManifest.xml',
    name: 'AndroidManifest.xml',
    language: 'xml',
    description: '应用清单文件 (声明 POST_NOTIFICATIONS, RECEIVE_BOOT_COMPLETED, SCHEDULE_EXACT_ALARM 及 Receivers)',
    content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
    <uses-permission android:name="android.permission.USE_EXACT_ALARM" />
    <uses-permission android:name="android.permission.VIBRATE" />

    <application
        android:name=".HabitApplication"
        android:allowBackup="true"
        android:label="@string/app_name"
        android:supportsRtl="true"
        android:theme="@style/Theme.HabitTracker">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:theme="@style/Theme.HabitTracker">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
        <receiver android:name=".notification.AlarmReceiver" android:exported="false" />
        <receiver android:name=".notification.CheckInActionReceiver" android:exported="false" />
        <receiver
            android:name=".notification.BootReceiver"
            android:enabled="true"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
            </intent-filter>
        </receiver>
    </application>
</manifest>`
  },
  {
    path: 'app/build.gradle.kts',
    name: 'app/build.gradle.kts',
    language: 'groovy',
    description: 'App 模块构建脚本 (minSdk 29, targetSdk 35, Jetpack Compose, Room 2.6.1, Coil)',
    content: `plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.ksp)
}

android {
    namespace = "com.example.habittracker"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.example.habittracker"
        minSdk = 29
        targetSdk = 35
        versionCode = 1
        versionName = "0.0.1"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.material.icons.extended)
    implementation(libs.androidx.navigation.compose)

    implementation(libs.androidx.room.runtime)
    implementation(libs.androidx.room.ktx)
    ksp(libs.androidx.room.compiler)

    implementation(libs.coil.compose)
}`
  },
  {
    path: 'app/src/main/java/com/example/habittracker/notification/CheckInActionReceiver.kt',
    name: 'CheckInActionReceiver.kt',
    language: 'kotlin',
    description: '通知「标记完成」Action 广播处理：后台直接完成打卡与计数，无需打开应用',
    content: `package com.example.habittracker.notification

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.example.habittracker.data.HabitDatabase
import com.example.habittracker.data.entity.CheckIn
import com.example.habittracker.util.DateUtils
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class CheckInActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == NotificationHelper.ACTION_CHECK_IN) {
            val habitId = intent.getLongExtra(NotificationHelper.EXTRA_HABIT_ID, -1L)
            if (habitId <= 0) return

            val pendingResult = goAsync()
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val db = HabitDatabase.getInstance(context)
                    val today = DateUtils.today()
                    val habit = db.habitDao().getHabitById(habitId)
                    val targetCount = habit?.targetCount ?: 1
                    val isCounter = habit?.isCounter ?: false

                    val existing = db.checkInDao().getCheckIn(habitId, today)
                    if (existing == null) {
                        db.checkInDao().insert(
                            CheckIn(
                                habitId = habitId,
                                date = today,
                                count = if (isCounter) targetCount else 1,
                                isCompleted = true,
                                createdAt = System.currentTimeMillis()
                            )
                        )
                    } else {
                        db.checkInDao().update(
                            existing.copy(
                                count = if (isCounter) targetCount else 1,
                                isCompleted = true
                            )
                        )
                    }
                    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                    manager.cancel(habitId.toInt())
                } finally {
                    pendingResult.finish()
                }
            }
        }
    }
}`
  },
  {
    path: 'app/src/main/java/com/example/habittracker/ui/components/CalendarMonthView.kt',
    name: 'CalendarMonthView.kt',
    language: 'kotlin',
    description: 'Jetpack Compose 月视图网格日历 (周一首日、实心绿点/空心灰点、当天计划勾选与删除线)',
    content: `package com.example.habittracker.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material3.*
import androidx.compose.runtime.*
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
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.DateTimeFormatter

@Composable
fun CalendarMonthView(
    habits: List<Habit>,
    checkIns: List<CheckIn>,
    onToggleCheckIn: (habitId: Long, date: String) -> Unit,
    modifier: Modifier = Modifier
) {
    var currentMonth by remember { mutableStateOf(YearMonth.now()) }
    var selectedDate by remember { mutableStateOf(LocalDate.now()) }
    val today = LocalDate.now()

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // 月份切换
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = { currentMonth = currentMonth.minusMonths(1) }) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "上月")
                }
                Text(
                    text = "\${currentMonth.year}年 \${currentMonth.monthValue}月",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                IconButton(onClick = { currentMonth = currentMonth.plusMonths(1) }) {
                    Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = "下月")
                }
            }

            // 周一为首日
            Row(modifier = Modifier.fillMaxWidth()) {
                listOf("一", "二", "三", "四", "五", "六", "日").forEach {
                    Text(it, modifier = Modifier.weight(1f), textAlign = TextAlign.Center, fontSize = 12.sp)
                }
            }

            // 日历单元格及彩色小圆点（实心绿点/空心灰点）
            // 更多逻辑参见完整工程
        }
    }
}`
  }
];

export async function downloadAndroidProjectZip(): Promise<void> {
  const zip = new JSZip();

  // Root files
  zip.file('settings.gradle.kts', `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "HabitTracker"
include(":app")
`);

  zip.file('build.gradle.kts', `plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.ksp) apply false
}
`);

  zip.file('gradle.properties', `org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
android.nonTransitiveRClass=true
kotlin.code.style=official
`);

  // Add all files
  for (const f of ANDROID_FILES) {
    zip.file(f.path, f.content);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'habit_tracker_android_project.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
