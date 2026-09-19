package com.example.habittracker.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.example.habittracker.data.dao.CheckInDao
import com.example.habittracker.data.dao.HabitDao
import com.example.habittracker.data.entity.CheckIn
import com.example.habittracker.data.entity.Habit

@Database(
    entities = [Habit::class, CheckIn::class],
    version = 1,
    // 打开 schema 导出，app/schemas/ 下的 JSON 要纳入版本管理。
    // 否则后续既无法使用 AutoMigration，手写迁移时也缺少可比对的历史 schema。
    exportSchema = true
)
abstract class HabitDatabase : RoomDatabase() {
    abstract fun habitDao(): HabitDao
    abstract fun checkInDao(): CheckInDao

    companion object {
        @Volatile
        private var INSTANCE: HabitDatabase? = null

        fun getInstance(context: Context): HabitDatabase {
            return INSTANCE ?: synchronized(this) {
                // 不使用 fallbackToDestructiveMigration()：它会在任何未编写迁移的 schema
                // 变更时直接删库，导致用户的习惯、打卡历史和照片关联全部丢失。
                // 今后每次改实体，必须在这里 addMigrations(...) 显式编写迁移。
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    HabitDatabase::class.java,
                    "habit_tracker.db"
                ).build()
                INSTANCE = instance
                instance
            }
        }
    }
}
