package com.example.habittracker.data.entity

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

    // 重复方式: "none", "daily", "weekly", "monthly", "interval"
    val recurrenceType: String = "daily",
    val startDate: String = "", // "yyyy-MM-dd"
    val endDate: String? = null, // "yyyy-MM-dd"
    val weeklyDays: String? = null, // comma-separated: "1,3,5" (1=Mon, 7=Sun)
    val monthlyDays: String? = null, // comma-separated: "15"
    val intervalDays: Int = 1, // 每 N 天

    // 计数器功能
    val isCounter: Boolean = false,
    val targetCount: Int = 1, // 如 3 杯水
    val unit: String = "次" // "杯", "组", "次"
)
