package com.example.habittracker.data.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.example.habittracker.data.entity.StandaloneCounter
import kotlinx.coroutines.flow.Flow

@Dao
interface StandaloneCounterDao {

    /** 最近更新的排在最前。 */
    @Query("SELECT * FROM standalone_counters ORDER BY updatedAt DESC, id DESC")
    fun getAllCounters(): Flow<List<StandaloneCounter>>

    @Query("SELECT * FROM standalone_counters WHERE id = :id LIMIT 1")
    suspend fun getCounterById(id: Long): StandaloneCounter?

    /**
     * 同为正整数固定的增visit：这里没有外键级联风险（计数器是孤立实体），
     * 但依然用 IGNORE —— 更新统一走 [update]，避免任何"先删后插"的语义意外。
     */
    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insert(counter: StandaloneCounter): Long

    @Update
    suspend fun update(counter: StandaloneCounter)

    /** 全量导出用的一次性快照。 */
    @Query("SELECT * FROM standalone_counters ORDER BY id ASC")
    suspend fun getAllCountersSync(): List<StandaloneCounter>

    /** 仅供备份恢复时清空表。 */
    @Query("DELETE FROM standalone_counters")
    suspend fun deleteAll()

    @Query("DELETE FROM standalone_counters WHERE id = :id")
    suspend fun deleteById(id: Long)

    /**
     * 原子自增/自减，避免「先读再写」在多协程下丢 Updates。
     * 金额式写法与自己读出来 + delta 再 [update] 的区别在于：这里在 SQL 层完成累加。
     */
    @Query(
        """
        UPDATE standalone_counters
        SET currentCount = MAX(0, currentCount + :delta),
            updatedAt = :now
        WHERE id = :id
        """
    )
    suspend fun applyStep(id: Long, delta: Int, now: Long = System.currentTimeMillis())

    @Query(
        """
        UPDATE standalone_counters
        SET currentCount = :value,
            updatedAt = :now
        WHERE id = :id
        """
    )
    suspend fun setCount(id: Long, value: Int, now: Long = System.currentTimeMillis())
}
