package com.example.habittracker.viewmodel

import android.content.Context
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.habittracker.data.dao.CheckInWithHabit
import com.example.habittracker.data.entity.Habit
import com.example.habittracker.data.repository.HabitRepository
import com.example.habittracker.model.DayProgress
import com.example.habittracker.model.HabitWithStats
import com.example.habittracker.util.DateUtils
import com.example.habittracker.util.ImageStorageManager
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class HabitViewModel(private val repository: HabitRepository) : ViewModel() {

    val habitsWithStats: StateFlow<List<HabitWithStats>> = repository.habitsWithStats
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

    val historyRecords: StateFlow<List<CheckInWithHabit>> = repository.allCheckInsWithHabits
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    fun toggleCheckIn(habitId: Long) {
        viewModelScope.launch {
            repository.toggleCheckIn(habitId, DateUtils.today())
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

    fun addHabit(
        name: String,
        iconName: String,
        colorHex: String,
        reminderTime: String?
    ) {
        viewModelScope.launch {
            val currentList = habitsWithStats.value
            val nextOrder = currentList.size
            val habit = Habit(
                name = name.trim(),
                iconName = iconName,
                colorHex = colorHex,
                reminderTime = reminderTime,
                sortOrder = nextOrder
            )
            repository.addHabit(habit)
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
