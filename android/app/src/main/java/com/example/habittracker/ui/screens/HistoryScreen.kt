package com.example.habittracker.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.History
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.example.habittracker.ui.components.CalendarMonthView
import com.example.habittracker.ui.components.EmptyState
import com.example.habittracker.ui.components.PhotoViewerDialog
import com.example.habittracker.ui.components.getIconVector
import com.example.habittracker.ui.components.parseColorSafe
import com.example.habittracker.viewmodel.HabitViewModel
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun HistoryScreen(
    viewModel: HabitViewModel,
    modifier: Modifier = Modifier
) {
    val habits by viewModel.allHabits.collectAsState()
    val allCheckIns by viewModel.allCheckIns.collectAsState()
    val historyRecords by viewModel.historyRecords.collectAsState()
    var selectedPhotoPath by remember { mutableStateOf<String?>(null) }

    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Text(
                text = "打卡计划日历与历史",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )
        }

        // Detailed Month Grid Calendar with Monday first, dot indicators, and day plans checklist
        item {
            CalendarMonthView(
                habits = habits,
                checkIns = allCheckIns,
                onToggleCheckIn = { habitId, date ->
                    viewModel.toggleCheckIn(habitId, date)
                },
                onIncrement = { habitId, date ->
                    viewModel.incrementCheckIn(habitId, date)
                },
                onDecrement = { habitId, date ->
                    viewModel.decrementCheckIn(habitId, date)
                }
            )
        }

        item {
            Text(
                text = "全部打卡流水与照片",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.padding(top = 8.dp)
            )
        }

        if (historyRecords.isEmpty()) {
            item {
                EmptyState(
                    title = "暂无打卡记录",
                    subtitle = "今天在首页完成习惯打卡，留存打卡照片和连续记录吧！",
                    icon = Icons.Outlined.History
                )
            }
        } else {
            items(
                items = historyRecords,
                key = { it.checkIn.id }
            ) { record ->
                val checkIn = record.checkIn
                val habit = record.habit
                // 注意：Composable 作用域内不允许用 try/catch 包裹 Composable 调用
                // （MaterialTheme.colorScheme 本身是 @Composable），所以解析逻辑放在普通函数里
                val habitColor = parseColorSafe(
                    habit?.colorHex ?: "",
                    MaterialTheme.colorScheme.primary
                )

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Icon
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .clip(CircleShape)
                                .background(habitColor.copy(alpha = 0.15f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = getIconVector(habit?.iconName ?: "Star"),
                                contentDescription = null,
                                tint = habitColor,
                                modifier = Modifier.size(22.dp)
                            )
                        }

                        Spacer(modifier = Modifier.width(12.dp))

                        // Habit Name & Date
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = habit?.name ?: "已归档习惯",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            val timeFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
                            val checkInTime = timeFormat.format(Date(checkIn.createdAt))
                            Text(
                                text = "${checkIn.date}  $checkInTime",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }

                        // Photo Thumbnail if present
                        if (checkIn.photoPath != null) {
                            Box(
                                modifier = Modifier
                                    .size(48.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .clickable { selectedPhotoPath = checkIn.photoPath }
                            ) {
                                AsyncImage(
                                    model = File(checkIn.photoPath),
                                    contentDescription = "打卡凭证照片",
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier.fillMaxSize()
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    selectedPhotoPath?.let { path ->
        PhotoViewerDialog(
            photoPath = path,
            onDismiss = { selectedPhotoPath = null }
        )
    }
}
