package com.example.habittracker.util

import com.example.habittracker.data.entity.CheckIn
import com.example.habittracker.data.entity.Habit
import com.example.habittracker.data.entity.StandaloneCounter
import org.json.JSONArray
import org.json.JSONObject

/**
 * 备份文件的编解码。
 *
 * 刻意不引入 Gson / Moshi：
 * - 实体字段是固定的、数量有限，手写编解码反而更可控；
 * - 更重要的是**保持字段顺序与空值语义显式可见**，将来某个字段改名时，
 *   这里会显式报错，而不是像反射序列化那样静默产生读不回来的备份文件。
 *
 * 注意：本类依赖 org.json，因此**不能在纯 JVM 单元测试里使用**
 * （android.jar 的方法桩会抛 RuntimeException("Stub!")）。
 */
object BackupCodec {

    const val FORMAT_VERSION = 2

    data class BackupData(
        val habits: List<Habit>,
        val checkIns: List<CheckIn>,
        val counters: List<StandaloneCounter>
    )

    fun exportToJson(data: BackupData): String {
        val habitsArray = JSONArray()
        data.habits.forEach { h ->
            habitsArray.put(
                JSONObject().apply {
                    put("id", h.id)
                    put("name", h.name)
                    putNullable("description", h.description)
                    put("iconName", h.iconName)
                    put("colorHex", h.colorHex)
                    putNullable("reminderTime", h.reminderTime)
                    put("sortOrder", h.sortOrder)
                    put("archived", h.archived)
                    put("recurrenceType", h.recurrenceType)
                    put("startDate", h.startDate)
                    putNullable("endDate", h.endDate)
                    putNullable("weeklyDays", h.weeklyDays)
                    putNullable("monthlyDays", h.monthlyDays)
                    put("intervalDays", h.intervalDays)
                    put("isCounter", h.isCounter)
                    put("targetCount", h.targetCount)
                    put("unit", h.unit)
                }
            )
        }

        val checkInsArray = JSONArray()
        data.checkIns.forEach { c ->
            checkInsArray.put(
                JSONObject().apply {
                    put("id", c.id)
                    put("habitId", c.habitId)
                    put("date", c.date)
                    putNullable("photoPath", c.photoPath)
                    putNullable("note", c.note)
                    put("count", c.count)
                    put("isCompleted", c.isCompleted)
                    put("createdAt", c.createdAt)
                }
            )
        }

        val countersArray = JSONArray()
        data.counters.forEach { c ->
            countersArray.put(
                JSONObject().apply {
                    put("id", c.id)
                    put("name", c.name)
                    put("currentCount", c.currentCount)
                    put("hasLimit", c.hasLimit)
                    putNullable("limitCount", c.limitCount)
                    put("unit", c.unit)
                    put("step", c.step)
                    put("colorHex", c.colorHex)
                    putNullable("note", c.note)
                    put("createdAt", c.createdAt)
                    put("updatedAt", c.updatedAt)
                }
            )
        }

        return JSONObject().apply {
            put("formatVersion", FORMAT_VERSION)
            put("exportedAt", System.currentTimeMillis())
            put("habits", habitsArray)
            put("checkIns", checkInsArray)
            put("standaloneCounters", countersArray)
        }.toString(2) // 缩进 2 空格，便于用户在文本编辑器里查看
    }

    /** @throws org.json.JSONException 文件不是合法 JSON 或缺少字段时抛出。 */
    fun parse(json: String): BackupData {
        val root = JSONObject(json)
        val version = root.optInt("formatVersion", 1)
        if (version > FORMAT_VERSION) {
            throw IllegalArgumentException(
                "备份文件版本 $version 高于当前 App 支持的 $FORMAT_VERSION，请升级 App 后再恢复。"
            )
        }

        val habitsArray = root.optJSONArray("habits") ?: JSONArray()
        val habits = buildList {
            repeat(habitsArray.length()) { i ->
                val o = habitsArray.getJSONObject(i)
                add(
                    Habit(
                        id = o.optLong("id", 0L),
                        name = o.optString("name", ""),
                        description = o.optStringOrNull("description"),
                        iconName = o.optString("iconName", "Star"),
                        colorHex = o.optString("colorHex", "#10B981"),
                        reminderTime = o.optStringOrNull("reminderTime"),
                        sortOrder = o.optInt("sortOrder", 0),
                        archived = o.optBoolean("archived", false),
                        recurrenceType = o.optString("recurrenceType", "daily"),
                        startDate = o.optString("startDate", ""),
                        endDate = o.optStringOrNull("endDate"),
                        weeklyDays = o.optStringOrNull("weeklyDays"),
                        monthlyDays = o.optStringOrNull("monthlyDays"),
                        intervalDays = o.optInt("intervalDays", 1),
                        isCounter = o.optBoolean("isCounter", false),
                        targetCount = o.optInt("targetCount", 1),
                        unit = o.optString("unit", "次")
                    )
                )
            }
        }

        val checkInsArray = root.optJSONArray("checkIns") ?: JSONArray()
        val checkIns = buildList {
            repeat(checkInsArray.length()) { i ->
                val o = checkInsArray.getJSONObject(i)
                add(
                    CheckIn(
                        id = o.optLong("id", 0L),
                        habitId = o.optLong("habitId", 0L),
                        date = o.optString("date", ""),
                        photoPath = o.optStringOrNull("photoPath"),
                        note = o.optStringOrNull("note"),
                        count = o.optInt("count", 1),
                        isCompleted = o.optBoolean("isCompleted", true),
                        createdAt = o.optLong("createdAt", System.currentTimeMillis())
                    )
                )
            }
        }

        val countersArray = root.optJSONArray("standaloneCounters") ?: JSONArray()
        val counters = buildList {
            repeat(countersArray.length()) { i ->
                val o = countersArray.getJSONObject(i)
                add(
                    StandaloneCounter(
                        id = o.optLong("id", 0L),
                        name = o.optString("name", ""),
                        currentCount = o.optInt("currentCount", 0),
                        hasLimit = o.optBoolean("hasLimit", false),
                        limitCount = o.optIntOrNull("limitCount"),
                        unit = o.optString("unit", "次"),
                        step = o.optInt("step", 1),
                        colorHex = o.optString("colorHex", "#EF4444"),
                        note = o.optStringOrNull("note"),
                        createdAt = o.optLong("createdAt", System.currentTimeMillis()),
                        updatedAt = o.optLong("updatedAt", System.currentTimeMillis())
                    )
                )
            }
        }

        return BackupData(habits, checkIns, counters)
    }

    private fun JSONObject.putNullable(key: String, value: Any?) {
        if (value == null) put(key, JSONObject.NULL) else put(key, value)
    }

    private fun JSONObject.optStringOrNull(key: String): String? =
        if (isNull(key)) null else optString(key)

    private fun JSONObject.optIntOrNull(key: String): Int? =
        if (isNull(key)) null else optInt(key)
}
