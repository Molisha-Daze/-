package com.example.habittracker.util

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow

/**
 * 应用级偏好设置（目前只有界面字号）。
 *
 * 用 SharedPreferences + Listener 转 Flow，而不是数据库：
 * 字号属于设备本地的显示偏好，不属于用户数据，**不应该进备份文件**，
 * 也不该跟着数据迁移走。
 */
class AppSettings(context: Context) {

    private val prefs: SharedPreferences =
        context.applicationContext.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)

    /** 界面字号缩放倍数，默认 1.0（标准）。 */
    val fontScale: Flow<Float> = callbackFlow {
        val listener = SharedPreferences.OnSharedPreferenceChangeListener { _, key ->
            if (key == KEY_FONT_SCALE) {
                trySend(prefs.getFloat(KEY_FONT_SCALE, DEFAULT_FONT_SCALE))
            }
        }
        prefs.registerOnSharedPreferenceChangeListener(listener)
        trySend(prefs.getFloat(KEY_FONT_SCALE, DEFAULT_FONT_SCALE))
        awaitClose { prefs.unregisterOnSharedPreferenceChangeListener(listener) }
    }

    fun setFontScale(scale: Float) {
        prefs.edit().putFloat(KEY_FONT_SCALE, scale).apply()
    }

    enum class FontSize(val label: String, val scale: Float, val percent: String) {
        SMALL("小号", 0.875f, "87.5%"),
        NORMAL("标准", 1.0f, "100%"),
        LARGE("大号", 1.125f, "112.5%"),
        HUGE("特大", 1.25f, "125%")
    }

    companion object {
        private const val PREF_NAME = "app_settings"
        private const val KEY_FONT_SCALE = "font_scale"
        const val DEFAULT_FONT_SCALE = 1.0f

        /** 从当前缩放值反查对应的档位，找不到（例如旧数据 0.9）则归为标准。 */
        fun sizeOf(scale: Float): FontSize =
            FontSize.entries.firstOrNull { it.scale == scale } ?: FontSize.NORMAL
    }
}
