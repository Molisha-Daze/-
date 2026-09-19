package com.example.habittracker.ui.screens

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
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
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.RestartAlt
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.habittracker.data.entity.StandaloneCounter
import com.example.habittracker.ui.components.AddEditCounterDialog
import com.example.habittracker.ui.components.EmptyState
import com.example.habittracker.ui.components.parseColorSafe
import com.example.habittracker.viewmodel.HabitViewModel

/**
 * 独立计数器页。
 *
 * 与「今日打卡」体系完全解耦：这里没有日期、没有排期、没有连续天数，
 * 只是若干可自由增减的计数器，用来记录「冰箱里还剩几罐可乐」这类松keep数据。
 */
@Composable
fun StandaloneCountersScreen(
    viewModel: HabitViewModel,
    modifier: Modifier = Modifier
) {
    val counters by viewModel.standaloneCounters.collectAsState()

    var showEditor by remember { mutableStateOf(false) }
    var editingCounter by remember { mutableStateOf<StandaloneCounter?>(null) }
    var pendingDelete by remember { mutableStateOf<StandaloneCounter?>(null) }
    var pendingReset by remember { mutableStateOf<StandaloneCounter?>(null) }

    Scaffold(
        modifier = modifier,
        floatingActionButton = {
            FloatingActionButton(onClick = {
                editingCounter = null
                showEditor = true
            }) {
                Icon(Icons.Default.Add, contentDescription = "新建计数器")
            }
        }
    ) { padding ->
        if (counters.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                EmptyState(
                    title = "暂无独立计数器",
                    subtitle = "点击右下角按钮，创建你的第一个计数器，例如记录「冰箱里的可乐」"
                )
            }
            return@Scaffold
        }

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 88.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(items = counters, key = { it.id }) { counter ->
                CounterCard(
                    counter = counter,
                    onStep = { delta -> viewModel.stepCounter(counter.id, delta) },
                    onEdit = {
                        editingCounter = counter
                        showEditor = true
                    },
                    onDelete = { pendingDelete = counter },
                    onResetClick = { pendingReset = counter },
                    onResetLongClick = { viewModel.resetCounter(counter.id) }
                )
            }
        }
    }

    if (showEditor) {
        AddEditCounterDialog(
            initialCounter = editingCounter,
            onDismiss = { showEditor = false },
            onSave = { counter ->
                if (counter.id == 0L) {
                    viewModel.addCounter(counter)
                } else {
                    viewModel.updateCounter(counter)
                }
                showEditor = false
            }
        )
    }

    pendingDelete?.let { counter ->
        AlertDialog(
            onDismissRequest = { pendingDelete = null },
            title = { Text("删除计数器") },
            text = { Text("确定要删除「${counter.name}」吗？此操作不可撤销。") },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.deleteCounter(counter.id)
                    pendingDelete = null
                }) {
                    Text("删除", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { pendingDelete = null }) { Text("取消") }
            }
        )
    }

    pendingReset?.let { counter ->
        AlertDialog(
            onDismissRequest = { pendingReset = null },
            title = { Text("清零") },
            text = { Text("将「${counter.name}」的数值重置为 0。（长按清零按钮可直接跳过本确认）") },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.resetCounter(counter.id)
                    pendingReset = null
                }) {
                    Text("清零")
                }
            },
            dismissButton = {
                TextButton(onClick = { pendingReset = null }) { Text("取消") }
            }
        )
    }
}

@Composable
private fun CounterCard(
    counter: StandaloneCounter,
    onStep: (Int) -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    onResetClick: () -> Unit,
    onResetLongClick: () -> Unit
) {
    val themeColor = parseColorSafe(counter.colorHex, MaterialTheme.colorScheme.primary)
    val hasLimit = counter.hasLimit && counter.limitCount != null && counter.limitCount!! > 0
    val limit = counter.limitCount ?: 0
    val progress = if (hasLimit) (counter.currentCount.toFloat() / limit).coerceIn(0f, 1f) else 0f
    val remaining = if (hasLimit) (limit - counter.currentCount).coerceAtLeast(0) else 0
    val reachedLimit = hasLimit && counter.currentCount >= limit

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.Top) {
                Column(modifier = Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(10.dp)
                                .clip(CircleShape)
                                .background(themeColor)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = counter.name,
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.SemiBold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                    counter.note?.takeIf { it.isNotBlank() }?.let {
                        Text(
                            text = it,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                Row {
                    // 清零按钮同时支持短按确认与长按直接执行。
                    // 这里刻意不用 IconButton：它自带的 clickable 会与外层 combinedClickable
                    // 抢手势，导致长按/短按其中一个失效。直接自己画可点击区域最可控。
                    IconActionBox(
                        imageVector = Icons.Default.RestartAlt,
                        contentDescription = "清零，长按可直接清零",
                        onClick = onResetClick,
                        onLongClick = onResetLongClick
                    )
                    IconButton(onClick = onEdit) {
                        Icon(
                            Icons.Default.Edit,
                            contentDescription = "编辑",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    IconButton(onClick = onDelete) {
                        Icon(
                            Icons.Default.Delete,
                            contentDescription = "删除",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            if (hasLimit) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "上限：$limit ${counter.unit}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = if (reachedLimit) "已达上限" else "剩余：$remaining ${counter.unit}",
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.SemiBold,
                        color = if (reachedLimit) {
                            MaterialTheme.colorScheme.tertiary
                        } else {
                            MaterialTheme.colorScheme.onSurfaceVariant
                        }
                    )
                }
                Spacer(modifier = Modifier.height(6.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    LinearProgressIndicator(
                        progress = { progress },
                        modifier = Modifier
                            .weight(1f)
                            .height(6.dp)
                            .clip(RoundedCornerShape(3.dp)),
                        color = themeColor,
                        trackColor = MaterialTheme.colorScheme.surfaceVariant
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "${(progress * 100).toInt()}%",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            } else {
                Text(
                    text = "无上限自由计数",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.Bottom) {
                    Text(
                        text = counter.currentCount.toString(),
                        style = MaterialTheme.typography.displaySmall.copy(
                            fontWeight = FontWeight.ExtraBold,
                            color = themeColor
                        )
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = counter.unit,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 13.sp
                    )
                }

                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Button(
                        onClick = { onStep(-counter.step) },
                        enabled = counter.currentCount > 0,
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.surfaceVariant,
                            contentColor = MaterialTheme.colorScheme.onSurfaceVariant
                        ),
                        modifier = Modifier.size(44.dp),
                        contentPadding = PaddingValues(0.dp)
                    ) {
                        Icon(Icons.Default.Remove, contentDescription = "减 ${counter.step}")
                    }
                    Button(
                        onClick = { onStep(counter.step) },
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = themeColor),
                        modifier = Modifier.height(44.dp)
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("+${counter.step}", fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }
}

/**
 * 自绘图标按钮，支持点击 + 长按。
 * 不用 IconButton 是为了避免其内置 clickable 与 [combinedClickable] 抢手势。
 */
@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun IconActionBox(
    imageVector: ImageVector,
    contentDescription: String,
    onClick: () -> Unit,
    onLongClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .size(40.dp)
            .clip(RoundedCornerShape(10.dp))
            .combinedClickable(onClick = onClick, onLongClick = onLongClick)
            .semantics { this.contentDescription = contentDescription },
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = imageVector,
            contentDescription = null,
            modifier = Modifier.size(18.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
