package com.example.habittracker.data.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * 独立计数器：脱离「习惯/排期」概念的自由计数实体。
 *
 * 与 [Habit.isCounter] 是两回事，切勿混用：
 * - [Habit.isCounter] 是习惯内部的完成方式（如"喝水 3 杯"达标才算打卡），归属 today/history 链路；
 * - 本实体则是完全独立的计数器（如"冰箱里还剩几罐可乐"），没有日期、没有连续天数、不参与热力图。
 *
 * 字段命名与网页版 src/types.ts 的 StandaloneCounter 保持一致，
 * 便于将来两边做数据交换时对照。
 */
@Entity(tableName = "standalone_counters")
data class StandaloneCounter(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val name: String, // 计数器名称，如"冰箱里的可乐"
    val currentCount: Int = 0, // 当前计数值
    val hasLimit: Boolean = false, // 是否设置上限
    val limitCount: Int? = null, // 上限值，未设置时为 null
    val unit: String = "次", // 单位：罐、杯、次、件
    val step: Int = 1, // 单次点击增减步长，至少为 1
    val colorHex: String = "#EF4444", // 主题色
    val note: String? = null, // 备注说明
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
) {
    companion object {
        /** 可选主题色，与网页版 AddEditCounterModal 的 PRESET_COLORS 对齐。 */
        val PRESET_COLORS = listOf(
            "#EF4444", // 活力红
            "#F59E0B", // 琥珀橙
            "#10B981", // 翡翠绿
            "#0EA5E9", // 天蓝色
            "#8B5CF6", // 幻紫色
            "#EC4899" // 玫瑰粉
        )
    }
}
