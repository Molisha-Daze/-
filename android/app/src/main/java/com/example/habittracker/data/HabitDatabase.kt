package com.example.habittracker.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.example.habittracker.data.dao.CheckInDao
import com.example.habittracker.data.dao.HabitDao
import com.example.habittracker.data.dao.StandaloneCounterDao
import com.example.habittracker.data.entity.CheckIn
import com.example.habittracker.data.entity.Habit
import com.example.habittracker.data.entity.StandaloneCounter

/**
 * 1 → 2：新增独立计数器表。
 *
 * 这是纯粹的新表创建，不影响 habits / check_ins 的任何既有数据，
 * 因此对已安装用户是无损升级。但仍然必须显式写出 migration —— 见下方注释。
 */
val MIGRATION_1_2 = object : Migration(1, 2) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS `standalone_counters` (
                `id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                `name` TEXT NOT NULL,
                `currentCount` INTEGER NOT NULL,
                `hasLimit` INTEGER NOT NULL,
                `limitCount` INTEGER,
                `unit` TEXT NOT NULL,
                `step` INTEGER NOT NULL,
                `colorHex` TEXT NOT NULL,
                `note` TEXT,
                `createdAt` INTEGER NOT NULL,
                `updatedAt` INTEGER NOT NULL
            )
            """.trimIndent()
        )
    }
}

@Database(
    entities = [Habit::class, CheckIn::class, StandaloneCounter::class],
    version = 2,
    // 打开 schema 导出，app/schemas/ 下的 JSON 要纳入版本管理。
    // 否则后续既无法使用 AutoMigration，手写迁移时也缺少可比对的历史 schema。
    exportSchema = true
)
abstract class HabitDatabase : RoomDatabase() {
    abstract fun habitDao(): HabitDao
    abstract fun checkInDao(): CheckInDao
    abstract fun standaloneCounterDao(): StandaloneCounterDao

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
                )
                    .addMigrations(MIGRATION_1_2)
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
