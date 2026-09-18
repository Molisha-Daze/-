package com.example.habittracker.data.entity

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
    val date: String, // format "yyyy-MM-dd" in local timezone
    val photoPath: String? = null,
    val note: String? = null,
    val count: Int = 1, // 当前计数 (如喝水 2 杯)
    val isCompleted: Boolean = true, // 是否已完成
    val createdAt: Long = System.currentTimeMillis()
)
