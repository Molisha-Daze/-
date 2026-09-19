package com.example.habittracker.viewmodel

import android.content.Context
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.habittracker.data.dao.CheckInWithHabit
import com.example.habittracker.data.entity.CheckIn
import com.example.habittracker.data.entity.Habit
import com.example.habittracker.data.entity.StandaloneCounter
import com.example.habittracker.data.repository.HabitRepository
import com.example.habittracker.model.DayProgress
import com.example.habittracker.model.HabitWithStats
import com.example.habittracker.util.DateUtils
import com.example.habittracker.util.ImageStorageManager
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class HabitViewModel(private val repository: HabitRepository) : ViewModel() {

    /** 全部活跃习惯（含今天没排期的），供「习惯管理」页使用。 */
    val habitsWithStats: StateFlow<List<HabitWithStats>> = repository.habitsWithStats
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    /** 今天真正有排期的习惯，供「今日打卡」页使用。 */
    val todayHabits: StateFlow<List<HabitWithStats>> = repository.habitsWithStats
        .map { list -> list.filter { it.scheduledToday } }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    val allHabits: StateFlow<List<Habit>> = repository.allHabits
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    val allCheckIns: StateFlow<List<CheckIn>> = repository.allCheckIns
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    val heatMapProgress: StateFlow<List<DayProgress>> = repository.getHeatMapProgress(35)
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    val standaloneCounters: StateFlow<List<StandaloneCounter>> = repository.allStandaloneCounters
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    val historyRecords: StateFlow<List<CheckInWithHabit>> = repository.allCheckInsWithHabits
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    fun toggleCheckIn(habitId: Long, date: String = DateUtils.today()) {
        viewModelScope.launch {
            repository.toggleCheckIn(habitId, date)
        }
    }

    /** 计数器习惯 +1 */
    fun incrementCheckIn(habitId: Long, date: String = DateUtils.today()) {
        viewModelScope.launch {
            repository.incrementCheckIn(habitId, date)
        }
    }

    /** 计数器习惯 -1 */
    fun decrementCheckIn(habitId: Long, date: String = DateUtils.today()) {
        viewModelScope.launch {
            repository.decrementCheckIn(habitId, date)
        }
    }

    /**
     * Persists the photo from PhotoPicker temporary Uri into app private storage,
     * then saves the absolute path in Room.
     */
    fun attachPhotoFromUri(context: Context, habitId: Long, uri: Uri) {
        viewModelScope.launch {
            val localPath = ImageStorageManager.saveImageToAppStorage(
                context = context,
                uri = uri,
                habitId = habitId,
                date = DateUtils.today()
            )
            if (localPath != null) {
                repository.attachPhoto(habitId, DateUtils.today(), localPath)
            }
        }
    }

    fun removePhoto(habitId: Long) {
        viewModelScope.launch {
            repository.removePhoto(habitId, DateUtils.today())
        }
    }

    fun addHabit(habit: Habit) {
        viewModelScope.launch {
            val nextOrder = habitsWithStats.value.size
            repository.addHabit(habit.copy(sortOrder = nextOrder))
        }
    }

    fun updateHabit(habit: Habit) {
        viewModelScope.launch {
            repository.updateHabit(habit)
        }
    }

    fun deleteHabit(habit: Habit) {
        viewModelScope.launch {
            repository.deleteHabit(habit)
        }
    }

    fun moveHabit(fromIndex: Int, toIndex: Int) {
        viewModelScope.launch {
            val current = habitsWithStats.value.map { it.habit }.toMutableList()
            if (fromIndex in current.indices && toIndex in current.indices) {
                val item = current.removeAt(fromIndex)
                current.add(toIndex, item)
                repository.updateHabitOrder(current)
            }
        }
    }

    // ---------- 独立计数器 ----------

    fun addCounter(counter: StandaloneCounter) {
        viewModelScope.launch {
            repository.addCounter(counter)
        }
    }

    fun updateCounter(counter: StandaloneCounter) {
        viewModelScope.launch {
            repository.updateCounter(counter)
        }
    }

    fun deleteCounter(id: Long) {
        viewModelScope.launch {
            repository.deleteCounter(id)
        }
    }

    /** 增减计数。UI 传入的已经是带符号的步长（如 -step / +step）。 */
    fun stepCounter(id: Long, delta: Int) {
        viewModelScope.launch {
            repository.stepCounter(id, delta)
        }
    }

    fun resetCounter(id: Long) {
        viewModelScope.launch {
            repository.resetCounter(id)
        }
    }

    // ---------- 备份与恢复 ----------

    /** 生成备份 JSON 字符串。由调用方负责写入目标 Uri。 */
    suspend fun exportBackupJson(): String = repository.exportBackupJson()

    fun importBackupJson(json: String) {
        viewModelScope.launch {
            repository.importBackupJson(json)
        }
    }
}

class HabitViewModelFactory(private val repository: HabitRepository) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(HabitViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return HabitViewModel(repository) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
