package com.example.habittracker.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.example.habittracker.data.entity.StandaloneCounter

/**
 * 独立计数器的新建 / 编辑弹窗。
 *
 * 校验规则与网页版 AddEditCounterModal.handleSubmit 保持一致：
 * 名称必填去空白、步长为正、单位去空白后兜底为「次」、开启上限时上限至少为 1。
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddEditCounterDialog(
    initialCounter: StandaloneCounter? = null,
    onDismiss: () -> Unit,
    onSave: (StandaloneCounter) -> Unit
) {
    var name by remember { mutableStateOf(initialCounter?.name ?: "") }
    var currentCountText by remember {
        mutableStateOf((initialCounter?.currentCount ?: 0).toString())
    }
    var hasLimit by remember { mutableStateOf(initialCounter?.hasLimit ?: false) }
    var limitCountText by remember {
        mutableStateOf((initialCounter?.limitCount ?: 10).toString())
    }
    var unit by remember { mutableStateOf(initialCounter?.unit ?: "次") }
    var stepText by remember { mutableStateOf((initialCounter?.step ?: 1).toString()) }
    var colorHex by remember { mutableStateOf(initialCounter?.colorHex ?: "#EF4444") }
    var note by remember { mutableStateOf(initialCounter?.note ?: "") }

    var nameError by remember { mutableStateOf(false) }

    val themeColor = parseColorSafe(colorHex, MaterialTheme.colorScheme.primary)

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(24.dp)
        ) {
            Column(
                modifier = Modifier
                    .padding(20.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = if (initialCounter == null) "新建独立计数器" else "编辑独立计数器",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.weight(1f)
                    )
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "关闭")
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = name,
                    onValueChange = {
                        name = it
                        if (it.isNotBlank()) nameError = false
                    },
                    label = { Text("计数器名称") },
                    placeholder = { Text("例如：冰箱里的可乐") },
                    isError = nameError,
                    supportingText = if (nameError) {
                        { Text("请输入计数器名称") }
                    } else null,
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(modifier = Modifier.height(12.dp))

                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(
                        value = currentCountText,
                        onValueChange = { input ->
                            currentCountText = input.filter { it.isDigit() }.take(9)
                        },
                        label = { Text("当前数值") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp)
                    )
                    OutlinedTextField(
                        value = unit,
                        onValueChange = { input -> unit = input.take(6) },
                        label = { Text("单位") },
                        placeholder = { Text("罐 / 杯 / 次") },
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp)
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                // 上限设置
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f))
                        .padding(14.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "设置上限 / 容量",
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.SemiBold
                            )
                            Text(
                                text = if (hasLimit) {
                                    "将显示剩余量与进度条"
                                } else {
                                    "不设上限，可无限累计"
                                },
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Switch(checked = hasLimit, onCheckedChange = { hasLimit = it })
                    }

                    if (hasLimit) {
                        Spacer(modifier = Modifier.height(12.dp))
                        OutlinedTextField(
                            value = limitCountText,
                            onValueChange = { input ->
                                limitCountText = input.filter { it.isDigit() }.take(9)
                            },
                            label = { Text("上限数值（${unit.ifBlank { "次" }}）") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = stepText,
                    onValueChange = { input ->
                        stepText = input.filter { it.isDigit() }.take(3)
                    },
                    label = { Text("点击步长") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = note,
                    onValueChange = { note = it },
                    label = { Text("备注说明（可选）") },
                    placeholder = { Text("例如：喝一次点一下") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "主题色",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Spacer(modifier = Modifier.height(10.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    StandaloneCounter.PRESET_COLORS.forEach { hex ->
                        val swatch = parseColorSafe(hex, MaterialTheme.colorScheme.primary)
                        val selected = colorHex == hex
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(swatch)
                                .then(
                                    if (selected) {
                                        Modifier.border(
                                            width = 2.dp,
                                            color = MaterialTheme.colorScheme.onSurface,
                                            shape = CircleShape
                                        )
                                    } else Modifier
                                )
                                .clickable { colorHex = hex }
                        )
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    TextButton(onClick = onDismiss) {
                        Text("取消")
                    }
                    Spacer(modifier = Modifier.size(8.dp))
                    Button(
                        onClick = {
                            if (name.isBlank()) {
                                nameError = true
                                return@Button
                            }
                            val parsedCount = currentCountText.toIntOrNull() ?: 0
                            val parsedLimit = limitCountText.toIntOrNull() ?: 1
                            val base = initialCounter ?: StandaloneCounter(name = "")
                            onSave(
                                base.copy(
                                    name = name.trim(),
                                    currentCount = parsedCount.coerceAtLeast(0),
                                    hasLimit = hasLimit,
                                    limitCount = if (hasLimit) parsedLimit.coerceAtLeast(1) else null,
                                    unit = unit.trim().ifBlank { "次" },
                                    step = (stepText.toIntOrNull() ?: 1).coerceAtLeast(1),
                                    colorHex = colorHex,
                                    note = note.trim().ifBlank { null },
                                    updatedAt = System.currentTimeMillis()
                                )
                            )
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = themeColor)
                    ) {
                        Text("保存计数器", color = Color.White)
                    }
                }
            }
        }
    }
}
