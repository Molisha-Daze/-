/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Habit, CheckIn, HabitStats, DayProgress, RecurrenceType, StandaloneCounter } from './types';
import {
  loadAllHabits,
  loadAllCheckIns,
  saveHabit,
  deleteHabit,
  updateHabitsOrder,
  toggleCheckIn,
  stepHabitCount,
  attachPhotoToCheckIn,
  removePhotoFromCheckIn,
  toggleSubTask,
  loadAllCounters,
  saveCounter,
  deleteCounter,
  stepCounter,
  resetCounter,
  initSampleDataIfEmpty
} from './services/db';
import { calculateStreaks, getLocalDateString } from './utils/streak';
import { isHabitScheduledForDate, formatRecurrenceLabel } from './utils/dateSchedule';
import { HabitCardWeb, getHabitIconComponent } from './components/HabitCardWeb';
import { CalendarMonthView } from './components/CalendarMonthView';
import { DayDetailModal } from './components/DayDetailModal';
import { AddEditHabitModal } from './components/AddEditHabitModal';
import { StandaloneCountersView } from './components/StandaloneCountersView';
import { AddEditCounterModal } from './components/AddEditCounterModal';
import { PhotoViewerModal } from './components/PhotoViewerModal';
import { NotificationBanner } from './components/NotificationBanner';
import { CodeViewerModal } from './components/CodeViewerModal';
import { AcceptanceTestModal } from './components/AcceptanceTestModal';
import { FontSizeModal, FontSizeOption } from './components/FontSizeModal';
import { AboutModal } from './components/AboutModal';
import { DataBackupModal } from './components/DataBackupModal';
import { NotificationSettingsModal } from './components/NotificationSettingsModal';
import { InstallApkModal } from './components/InstallApkModal';
import { clearAllAndResetDefaults } from './services/db';
import {
  CheckCircle2,
  Calendar as CalendarIcon,
  Sliders,
  Plus,
  Moon,
  Sun,
  Smartphone,
  Code,
  ShieldCheck,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  Inbox,
  Clock,
  Sparkles,
  Layers,
  Hash,
  ListTodo,
  Type,
  HardDriveDownload,
  Bell,
  Settings
} from 'lucide-react';

export default function App() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [counters, setCounters] = useState<StandaloneCounter[]>([]);
  const [activeTab, setActiveTab] = useState<'today' | 'history' | 'counters' | 'manage'>('today');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches || false;
  });
  const [isPhoneFrame, setIsPhoneFrame] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [editingCounter, setEditingCounter] = useState<StandaloneCounter | null>(null);
  const [viewingPhotoUrl, setViewingPhotoUrl] = useState<string | null>(null);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showAcceptanceModal, setShowAcceptanceModal] = useState(false);
  const [detailDate, setDetailDate] = useState<string | null>(null);

  // Software Management Modals
  const [showFontSizeModal, setShowFontSizeModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showNotificationSettingsModal, setShowNotificationSettingsModal] = useState(false);
  const [showInstallApkModal, setShowInstallApkModal] = useState(false);

  // Software Font Size
  const [fontSize, setFontSize] = useState<FontSizeOption>(() => {
    const saved = localStorage.getItem('app_font_size') as FontSizeOption;
    return (saved && ['small', 'normal', 'large', 'huge'].includes(saved)) ? saved : 'normal';
  });

  // Apply Font Size dynamically to root document
  useEffect(() => {
    const sizeMap: Record<FontSizeOption, string> = {
      small: '14px',
      normal: '16px',
      large: '18px',
      huge: '20px'
    };
    document.documentElement.style.fontSize = sizeMap[fontSize] || '16px';
    localStorage.setItem('app_font_size', fontSize);
  }, [fontSize]);

  // Simulated Android Reminder Notification
  const [activeNotification, setActiveNotification] = useState<{
    habitId: number;
    habitName: string;
    isCounter?: boolean;
    unit?: string;
    targetCount?: number;
    currentCount?: number;
  } | null>(null);

  // Load database on mount
  useEffect(() => {
    const init = async () => {
      await initSampleDataIfEmpty();
      const loadedHabits = await loadAllHabits();
      const loadedCheckIns = await loadAllCheckIns();
      const loadedCounters = await loadAllCounters();
      setHabits(loadedHabits);
      setCheckIns(loadedCheckIns);
      setCounters(loadedCounters);
    };
    init();
  }, []);

  // Update dark mode class on document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const todayStr = useMemo(() => getLocalDateString(), []);

  // Habits scheduled for today
  const todayScheduledHabits = useMemo(() => {
    return habits.filter((h) => isHabitScheduledForDate(h, todayStr));
  }, [habits, todayStr]);

  // Calculate Real-time Stats for Habits
  const habitsWithStats: HabitStats[] = useMemo(() => {
    const checkInsByHabit = new Map<number, CheckIn[]>();
    for (const c of checkIns) {
      if (!checkInsByHabit.has(c.habitId)) {
        checkInsByHabit.set(c.habitId, []);
      }
      checkInsByHabit.get(c.habitId)!.push(c);
    }

    return todayScheduledHabits.map((habit) => {
      const habitCheckIns = checkInsByHabit.get(habit.id) || [];
      const dateStrings = habitCheckIns.map((c) => c.date);
      const todayCheckIn = habitCheckIns.find((c) => c.date === todayStr);

      const { currentStreak, longestStreak } = calculateStreaks(dateStrings);

      const isCompleted = habit.isCounter
        ? (todayCheckIn?.count || 0) >= (habit.targetCount || 1)
        : !!todayCheckIn?.isCompleted || (todayCheckIn?.count || 0) > 0;

      return {
        habit,
        isCompletedToday: isCompleted,
        todayCheckIn,
        currentStreak,
        longestStreak,
        totalCheckIns: habitCheckIns.length,
        currentCount: todayCheckIn?.count || 0
      };
    });
  }, [todayScheduledHabits, checkIns, todayStr]);

  // Today progress
  const todayCompletedCount = habitsWithStats.filter((h) => h.isCompletedToday).length;
  const todayTotalCount = habitsWithStats.length;
  const todayRatio = todayTotalCount > 0 ? todayCompletedCount / todayTotalCount : 0;

  // Handlers
  const handleToggleCheckIn = async (habitId: number, date: string = todayStr, targetCount: number = 1) => {
    const habit = habits.find((h) => h.id === habitId);
    const subTaskIds = habit?.subTasks?.map((s) => s.id);
    await toggleCheckIn(habitId, date, targetCount, subTaskIds);
    const updatedCheckIns = await loadAllCheckIns();
    setCheckIns(updatedCheckIns);
  };

  const handleToggleSubTask = async (habitId: number, subTaskId: string) => {
    const habit = habits.find((h) => h.id === habitId);
    const totalSubTasks = habit?.subTasks?.length || 0;
    await toggleSubTask(habitId, todayStr, subTaskId, totalSubTasks);
    const updatedCheckIns = await loadAllCheckIns();
    setCheckIns(updatedCheckIns);
  };

  const handleToggleSubTaskForDate = async (
    habitId: number,
    date: string,
    subTaskId: string,
    totalSubTasks: number
  ) => {
    await toggleSubTask(habitId, date, subTaskId, totalSubTasks);
    const updatedCheckIns = await loadAllCheckIns();
    setCheckIns(updatedCheckIns);
  };

  const handleStepCount = async (habitId: number, date: string = todayStr, targetCount: number, delta: number) => {
    await stepHabitCount(habitId, date, targetCount, delta);
    const updatedCheckIns = await loadAllCheckIns();
    setCheckIns(updatedCheckIns);
  };

  // Standalone Counter Handlers
  const handleStepCounter = async (id: number, delta: number) => {
    await stepCounter(id, delta);
    const updated = await loadAllCounters();
    setCounters(updated);
  };

  const handleResetCounter = async (id: number, skipConfirmation = false) => {
    if (skipConfirmation || window.confirm('确定要将该独立计数器重置为 0 吗？')) {
      await resetCounter(id, 0);
      const updated = await loadAllCounters();
      setCounters(updated);
    }
  };

  const handleDeleteCounter = async (id: number) => {
    if (window.confirm('确定要删除该独立计数器吗？')) {
      await deleteCounter(id);
      const updated = await loadAllCounters();
      setCounters(updated);
    }
  };

  const handleSaveCounter = async (counterData: {
    name: string;
    currentCount: number;
    hasLimit: boolean;
    limitCount?: number | null;
    unit: string;
    step: number;
    colorHex: string;
    note?: string;
  }) => {
    if (editingCounter) {
      await saveCounter({
        ...editingCounter,
        ...counterData
      });
      setEditingCounter(null);
    } else {
      await saveCounter({
        ...counterData,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }
    const updated = await loadAllCounters();
    setCounters(updated);
    setShowCounterModal(false);
  };

  const handleAttachPhoto = async (habitId: number, date: string = todayStr, file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        await attachPhotoToCheckIn(habitId, date, dataUrl);
        const updatedCheckIns = await loadAllCheckIns();
        setCheckIns(updatedCheckIns);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = async (habitId: number, date: string = todayStr) => {
    await removePhotoFromCheckIn(habitId, date);
    const updatedCheckIns = await loadAllCheckIns();
    setCheckIns(updatedCheckIns);
  };

  const handleSaveHabit = async (habitData: {
    name: string;
    description?: string;
    iconName: string;
    colorHex: string;
    reminderTime: string | null;
    recurrenceType: RecurrenceType;
    startDate: string;
    endDate?: string | null;
    weeklyDays?: number[];
    monthlyDays?: number[];
    intervalDays?: number;
    isCounter?: boolean;
    targetCount?: number;
    unit?: string;
    isParentPlan?: boolean;
    subTasks?: Array<{ id: string; title: string }>;
  }) => {
    if (editingHabit) {
      const updated: Habit = {
        ...editingHabit,
        ...habitData
      };
      await saveHabit(updated);
      setEditingHabit(null);
    } else {
      const newHabit: Omit<Habit, 'id'> = {
        ...habitData,
        sortOrder: habits.length,
        archived: false,
        createdAt: Date.now()
      };
      await saveHabit(newHabit);
    }
    const updatedHabits = await loadAllHabits();
    setHabits(updatedHabits);
  };

  const handleDeleteHabit = async (habitId: number) => {
    if (window.confirm('确定要删除此计划吗？相关的历史打卡记录和照片也将被清除。')) {
      await deleteHabit(habitId);
      const updatedHabits = await loadAllHabits();
      const updatedCheckIns = await loadAllCheckIns();
      setHabits(updatedHabits);
      setCheckIns(updatedCheckIns);
    }
  };

  const handleMoveHabit = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= habits.length) return;

    const list = [...habits];
    const [moved] = list.splice(index, 1);
    list.splice(newIndex, 0, moved);

    await updateHabitsOrder(list);
    const updatedHabits = await loadAllHabits();
    setHabits(updatedHabits);
  };

  const handleRestoreData = async (data: { habits?: Habit[]; checkIns?: CheckIn[]; counters?: StandaloneCounter[] }) => {
    if (data.habits && Array.isArray(data.habits)) {
      for (const h of data.habits) {
        await saveHabit(h);
      }
    }
    if (data.counters && Array.isArray(data.counters)) {
      for (const c of data.counters) {
        await saveCounter(c);
      }
    }
    const loadedHabits = await loadAllHabits();
    const loadedCheckIns = await loadAllCheckIns();
    const loadedCounters = await loadAllCounters();
    setHabits(loadedHabits);
    setCheckIns(loadedCheckIns);
    setCounters(loadedCounters);
  };

  const handleResetAllData = async () => {
    await clearAllAndResetDefaults();
    const loadedHabits = await loadAllHabits();
    const loadedCheckIns = await loadAllCheckIns();
    const loadedCounters = await loadAllCounters();
    setHabits(loadedHabits);
    setCheckIns(loadedCheckIns);
    setCounters(loadedCounters);
  };

  const triggerTestNotification = () => {
    const targetHabit = habits.find((h) => h.isCounter) || habits[0] || {
      id: 1,
      name: '今日喝水量',
      isCounter: true,
      unit: '杯',
      targetCount: 3
    };

    const checkIn = checkIns.find((c) => c.habitId === targetHabit.id && c.date === todayStr);

    setActiveNotification({
      habitId: targetHabit.id,
      habitName: targetHabit.name,
      isCounter: targetHabit.isCounter,
      unit: targetHabit.unit,
      targetCount: targetHabit.targetCount,
      currentCount: checkIn?.count || 0
    });
  };

  // Habits to show in DayDetailModal
  const dayDetailScheduledHabits = useMemo(() => {
    if (!detailDate) return [];
    return habits.filter((h) => isHabitScheduledForDate(h, detailDate));
  }, [habits, detailDate]);

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-200 selection:bg-emerald-500/30">
      {/* Top Global Toolbar */}
      <header className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-4 py-2.5 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                每日习惯与计划打卡
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  Android 10 - 15 (Kotlin + Compose)
                </span>
              </h1>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                月视图网格日历 · 当天列表勾选与删除线 · 计划管理与计数器 · 通知栏一键完成
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="install-apk-btn"
              onClick={() => setShowInstallApkModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-xs font-semibold transition-colors border border-emerald-500/20"
              title="手机安装与导出 APK (v0.0.1)"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>手机安装 & APK</span>
            </button>

            <button
              id="view-code-btn"
              onClick={() => setShowCodeModal(true)}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-semibold transition-colors text-zinc-600 dark:text-zinc-300"
              title="查看 Android 完整工程源码 & 导出 ZIP"
            >
              <Code className="w-3.5 h-3.5 text-emerald-500" />
              <span>安卓源码</span>
            </button>

            <button
              id="acceptance-test-btn"
              onClick={() => setShowAcceptanceModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold transition-colors"
              title="查看自检与验收测试"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>自检面板</span>
            </button>

            <button
              id="toggle-phone-frame-btn"
              onClick={() => setIsPhoneFrame(!isPhoneFrame)}
              className={`p-2 rounded-xl border text-xs font-medium transition-colors ${
                isPhoneFrame
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent'
                  : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300'
              }`}
              title="切换手机真机框 / 宽屏视图"
            >
              <Smartphone className="w-4 h-4" />
            </button>

            <button
              id="toggle-dark-mode-btn"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors"
              title="切换深色/浅色模式"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden">
        <div
          className={`w-full transition-all duration-300 ${
            isPhoneFrame
              ? 'max-w-[430px] h-[890px] max-h-[94vh] rounded-[44px] border-[10px] border-zinc-900 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col bg-zinc-50 dark:bg-black relative'
              : 'max-w-3xl min-h-[720px] bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl flex flex-col'
          }`}
        >
          {/* Simulated Android Status Bar */}
          {isPhoneFrame && (
            <div className="h-7 bg-transparent flex items-center justify-between px-6 shrink-0 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 select-none z-10">
              <span>09:41</span>
              <div className="w-20 h-4 bg-zinc-800 dark:bg-zinc-900 rounded-full mx-auto" />
              <div className="flex items-center gap-1.5">
                <span>5G</span>
                <span>100%</span>
              </div>
            </div>
          )}

          {/* Screen Content Area */}
          <div className="flex-1 overflow-y-auto px-4 pt-3 pb-24 relative">
            {/* TAB 1: 今日打卡 (Today) */}
            {activeTab === 'today' && (
              <div className="space-y-4">
                {/* Header Summary Card */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl p-4 sm:p-5 border border-zinc-200 dark:border-zinc-800 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                        今日打卡
                      </h2>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                        {todayStr}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-xl text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{todayCompletedCount} / {todayTotalCount}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden mt-3">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.round(todayRatio * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-zinc-400 dark:text-zinc-500 mt-1.5">
                    <span>完成进度</span>
                    <span>{Math.round(todayRatio * 100)}%</span>
                  </div>
                </div>

                {/* Habit Cards List */}
                {habitsWithStats.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="w-16 h-16 rounded-3xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 mx-auto flex items-center justify-center mb-3">
                      <Inbox className="w-8 h-8" />
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                      今天没有计划排期
                    </h3>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 max-w-xs mx-auto">
                      点右下角 + 新增计划，设置每日或循环打卡与计数器目标吧！
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {habitsWithStats.map((item) => (
                      <HabitCardWeb
                        key={item.habit.id}
                        item={item}
                        onToggle={() => handleToggleCheckIn(item.habit.id, todayStr, item.habit.targetCount || 1)}
                        onStepCount={
                          item.habit.isCounter
                            ? (delta) => handleStepCount(item.habit.id, todayStr, item.habit.targetCount || 1, delta)
                            : undefined
                        }
                        onToggleSubTask={(subTaskId) => handleToggleSubTask(item.habit.id, subTaskId)}
                        onAttachPhoto={(file) => handleAttachPhoto(item.habit.id, todayStr, file)}
                        onRemovePhoto={() => handleRemovePhoto(item.habit.id, todayStr)}
                        onViewPhoto={(url) => setViewingPhotoUrl(url)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: 细化日历与历史回顾 (Calendar / History) */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                    打卡日历
                  </h2>
                </div>

                {/* Calendar Month View Grid + Day Tasks List */}
                <CalendarMonthView
                  habits={habits}
                  checkIns={checkIns}
                  onToggleCheckIn={handleToggleCheckIn}
                  onStepCount={handleStepCount}
                  onToggleSubTask={handleToggleSubTaskForDate}
                  onAttachPhoto={handleAttachPhoto}
                  onRemovePhoto={handleRemovePhoto}
                  onViewPhoto={(url) => setViewingPhotoUrl(url)}
                  onOpenDayDetail={(date) => setDetailDate(date)}
                />
              </div>
            )}

            {/* TAB 3: 独立计数器 (Standalone Counters) */}
            {activeTab === 'counters' && (
              <StandaloneCountersView
                counters={counters}
                onStepCounter={handleStepCounter}
                onResetCounter={handleResetCounter}
                onEditCounter={(counter: StandaloneCounter) => {
                  setEditingCounter(counter);
                  setShowCounterModal(true);
                }}
                onDeleteCounter={handleDeleteCounter}
                onAddCounter={() => {
                  setEditingCounter(null);
                  setShowCounterModal(true);
                }}
              />
            )}

            {/* TAB 4: 管理中心 (Settings & plan management) */}
            {activeTab === 'manage' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                    管理中心
                  </h2>
                </div>

                {/* 1x4 管理中心功能金刚区 (1x4 Feature Icons Grid) */}
                <div className="grid grid-cols-4 gap-2 sm:gap-3 bg-white dark:bg-zinc-900/90 p-2.5 sm:p-3 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
                  {/* Icon 1: 设置字号 */}
                  <button
                    id="manage-btn-fontsize"
                    type="button"
                    onClick={() => setShowFontSizeModal(true)}
                    className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/60 active:scale-95 transition-all text-center group cursor-pointer"
                  >
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1.5 shadow-2xs group-hover:bg-emerald-500/20 transition-colors">
                      <Type className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      设置字号
                    </span>
                    <span className="text-[10px] text-zinc-400 mt-0.5">
                      {fontSize === 'small' ? '小号' : fontSize === 'large' ? '大号' : fontSize === 'huge' ? '特大' : '标准'}
                    </span>
                  </button>

                  {/* Icon 2: 关于 */}
                  <button
                    id="manage-btn-about"
                    type="button"
                    onClick={() => setShowAboutModal(true)}
                    className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/60 active:scale-95 transition-all text-center group cursor-pointer"
                  >
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-1.5 shadow-2xs group-hover:bg-teal-500/20 transition-colors">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      关于
                    </span>
                    <span className="text-[10px] text-zinc-400 mt-0.5 font-mono">
                      v0.0.1
                    </span>
                  </button>

                  {/* Icon 3: 数据备份 */}
                  <button
                    id="manage-btn-backup"
                    type="button"
                    onClick={() => setShowBackupModal(true)}
                    className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/60 active:scale-95 transition-all text-center group cursor-pointer"
                  >
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1.5 shadow-2xs group-hover:bg-blue-500/20 transition-colors">
                      <HardDriveDownload className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      数据备份
                    </span>
                    <span className="text-[10px] text-zinc-400 mt-0.5">
                      导出恢复
                    </span>
                  </button>

                  {/* Icon 4: 提醒声音 */}
                  <button
                    id="manage-btn-notification"
                    type="button"
                    onClick={() => setShowNotificationSettingsModal(true)}
                    className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/60 active:scale-95 transition-all text-center group cursor-pointer"
                  >
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-1.5 shadow-2xs group-hover:bg-amber-500/20 transition-colors">
                      <Bell className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      提醒设置
                    </span>
                    <span className="text-[10px] text-zinc-400 mt-0.5">
                      声音通知
                    </span>
                  </button>
                </div>

                {/* 手机安装与导出 APK 快捷入口 */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/20 shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">手机安装与导出 APK</span>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">v0.0.1</span>
                      </div>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400">支持一键免编译安装到桌面，或导出完整 Android Studio 原生工程</p>
                    </div>
                  </div>
                  <button
                    id="manage-open-install-apk-btn"
                    type="button"
                    onClick={() => setShowInstallApkModal(true)}
                    className="shrink-0 ml-2 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                  >
                    查看与安装
                  </button>
                </div>

                {/* 计划清单标题与新增按钮 (Below the 1x4 icons) */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                      计划清单
                    </h3>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                      {habits.length} 项
                    </span>
                  </div>
                  <button
                    id="manage-add-habit-btn"
                    onClick={() => {
                      setEditingHabit(null);
                      setShowAddModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    新增计划
                  </button>
                </div>

                {habits.length === 0 ? (
                  <div className="py-16 text-center">
                    <Inbox className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
                    <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                      还没有任何计划项目
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      点右上角「新增计划」创建你的第一个习惯或打卡目标
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {habits.map((habit, index) => {
                      const IconComp = getHabitIconComponent(habit.iconName);
                      return (
                        <div
                          key={habit.id}
                          id={`manage-habit-${habit.id}`}
                          className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-3.5 flex flex-col gap-2.5 shadow-xs"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                style={{
                                  backgroundColor: `${habit.colorHex}18`,
                                  color: habit.colorHex
                                }}
                              >
                                <IconComp className="w-5 h-5" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                    {habit.name}
                                  </h4>
                                  {habit.isParentPlan && habit.subTasks && habit.subTasks.length > 0 && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-semibold inline-flex items-center gap-1">
                                      <ListTodo className="w-3 h-3" />
                                      {habit.subTasks.length} 个子任务
                                    </span>
                                  )}
                                  {habit.isCounter && !habit.isParentPlan && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold inline-flex items-center gap-1">
                                      <Layers className="w-3 h-3" />
                                      计数目标: {habit.targetCount}{habit.unit || '次'}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center flex-wrap gap-2 text-xs text-zinc-400 mt-1">
                                  <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-[11px]">
                                    {formatRecurrenceLabel(habit)}
                                  </span>

                                  {habit.reminderTime ? (
                                    <span className="inline-flex items-center gap-1 text-zinc-500 dark:text-zinc-400 text-[11px]">
                                      <Clock className="w-3 h-3 text-zinc-400 shrink-0" />
                                      <span>{habit.reminderTime}</span>
                                    </span>
                                  ) : (
                                    <span className="text-[11px]">无提醒</span>
                                  )}

                                  <span className="text-[11px]">生效: {habit.startDate}{habit.endDate ? ` 至 ${habit.endDate}` : ' (长期)'}</span>
                                </div>
                              </div>
                            </div>

                            {/* Reorder and Edit/Delete Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleMoveHabit(index, 'up')}
                                disabled={index === 0}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-30"
                                title="上移"
                              >
                                <ArrowUp className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleMoveHabit(index, 'down')}
                                disabled={index === habits.length - 1}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-30"
                                title="下移"
                              >
                                <ArrowDown className="w-4 h-4" />
                              </button>
                              <button
                                id={`edit-habit-btn-${habit.id}`}
                                onClick={() => {
                                  setEditingHabit(habit);
                                  setShowAddModal(true);
                                }}
                                className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                                title="编辑"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                id={`delete-habit-btn-${habit.id}`}
                                onClick={() => handleDeleteHabit(habit.id)}
                                className="p-1.5 rounded-lg text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                title="删除"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Description preview */}
                          {habit.description && (
                            <div className="text-[11px] bg-zinc-50 dark:bg-zinc-800/40 p-2 rounded-xl text-zinc-600 dark:text-zinc-400 whitespace-pre-line leading-relaxed border border-zinc-100 dark:border-zinc-800">
                              {habit.description}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Floating Action Button (FAB) on Today screen */}
          {activeTab === 'today' && (
            <button
              id="fab-add-habit"
              onClick={() => {
                setEditingHabit(null);
                setShowAddModal(true);
              }}
              className="absolute bottom-20 right-5 w-14 h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white flex items-center justify-center shadow-lg transition-transform z-20"
              aria-label="新增计划"
            >
              <Plus className="w-7 h-7 stroke-[2.5]" />
            </button>
          )}

          {/* Material 3 Bottom Navigation Bar */}
          <nav className="absolute bottom-0 inset-x-0 h-16 bg-white/95 dark:bg-zinc-900/95 border-t border-zinc-200/80 dark:border-zinc-800/80 backdrop-blur-md flex items-center justify-around px-4 z-20">
            <button
              id="nav-tab-today"
              onClick={() => setActiveTab('today')}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                activeTab === 'today'
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
              }`}
            >
              <div
                className={`px-4 py-1 rounded-full mb-0.5 transition-colors ${
                  activeTab === 'today' ? 'bg-emerald-500/15' : ''
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <span className="text-[11px]">今日打卡</span>
            </button>

            <button
              id="nav-tab-history"
              onClick={() => setActiveTab('history')}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                activeTab === 'history'
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
              }`}
            >
              <div
                className={`px-4 py-1 rounded-full mb-0.5 transition-colors ${
                  activeTab === 'history' ? 'bg-emerald-500/15' : ''
                }`}
              >
                <CalendarIcon className="w-5 h-5" />
              </div>
              <span className="text-[11px]">日历与回顾</span>
            </button>

            <button
              id="nav-tab-counters"
              onClick={() => setActiveTab('counters')}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                activeTab === 'counters'
                  ? 'text-purple-600 dark:text-purple-400 font-bold'
                  : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
              }`}
            >
              <div
                className={`px-4 py-1 rounded-full mb-0.5 transition-colors ${
                  activeTab === 'counters' ? 'bg-purple-500/15' : ''
                }`}
              >
                <Hash className="w-5 h-5" />
              </div>
              <span className="text-[11px]">独立计数器</span>
            </button>

            <button
              id="nav-tab-manage"
              onClick={() => setActiveTab('manage')}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                activeTab === 'manage'
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
              }`}
            >
              <div
                className={`px-4 py-1 rounded-full mb-0.5 transition-colors ${
                  activeTab === 'manage' ? 'bg-emerald-500/15' : ''
                }`}
              >
                <Sliders className="w-5 h-5" />
              </div>
              <span className="text-[11px]">管理中心</span>
            </button>
          </nav>
        </div>
      </main>

      {/* Simulated Android Alarm Notification Banner with Quick Action */}
      {activeNotification && (
        <NotificationBanner
          habitId={activeNotification.habitId}
          habitName={activeNotification.habitName}
          isCounter={activeNotification.isCounter}
          unit={activeNotification.unit}
          targetCount={activeNotification.targetCount}
          currentCount={activeNotification.currentCount}
          onCheckInNow={(habitId) => {
            const habit = habits.find((h) => h.id === habitId);
            handleToggleCheckIn(habitId, todayStr, habit?.targetCount || 1);
          }}
          onStepCountNow={
            activeNotification.isCounter
              ? (habitId) => {
                  const habit = habits.find((h) => h.id === habitId);
                  handleStepCount(habitId, todayStr, habit?.targetCount || 1, 1);
                }
              : undefined
          }
          onDismiss={() => setActiveNotification(null)}
        />
      )}

      {/* Add / Edit Habit Modal */}
      {showAddModal && (
        <AddEditHabitModal
          initialHabit={editingHabit}
          onClose={() => {
            setShowAddModal(false);
            setEditingHabit(null);
          }}
          onSave={handleSaveHabit}
        />
      )}

      {/* Add / Edit Standalone Counter Modal */}
      {showCounterModal && (
        <AddEditCounterModal
          initialCounter={editingCounter}
          onClose={() => {
            setShowCounterModal(false);
            setEditingCounter(null);
          }}
          onSave={handleSaveCounter}
        />
      )}

      {/* Day Detail Page / Modal */}
      {detailDate && (
        <DayDetailModal
          date={detailDate}
          habits={dayDetailScheduledHabits}
          checkIns={checkIns}
          onClose={() => setDetailDate(null)}
          onToggleCheckIn={handleToggleCheckIn}
          onStepCount={handleStepCount}
          onToggleSubTask={handleToggleSubTaskForDate}
          onAttachPhoto={handleAttachPhoto}
          onRemovePhoto={handleRemovePhoto}
          onViewPhoto={(url) => setViewingPhotoUrl(url)}
        />
      )}

      {/* Fullscreen Photo Lightbox Modal */}
      {viewingPhotoUrl && (
        <PhotoViewerModal
          photoUrl={viewingPhotoUrl}
          onClose={() => setViewingPhotoUrl(null)}
        />
      )}

      {/* Code Viewer & Project Zip Exporter Modal */}
      {showCodeModal && (
        <CodeViewerModal onClose={() => setShowCodeModal(false)} />
      )}

      {/* Acceptance Test Modal */}
      {showAcceptanceModal && (
        <AcceptanceTestModal
          onClose={() => setShowAcceptanceModal(false)}
          onTriggerNotificationTest={triggerTestNotification}
        />
      )}

      {/* Font Size Settings Modal */}
      {showFontSizeModal && (
        <FontSizeModal
          currentSize={fontSize}
          onChangeSize={setFontSize}
          onClose={() => setShowFontSizeModal(false)}
        />
      )}

      {/* About App Modal with version, quote & cursive English calligraphy */}
      {showAboutModal && (
        <AboutModal
          onClose={() => setShowAboutModal(false)}
          onOpenInstallApk={() => setShowInstallApkModal(true)}
        />
      )}

      {/* Data Backup & Restore Modal */}
      {showBackupModal && (
        <DataBackupModal
          habits={habits}
          checkIns={checkIns}
          counters={counters}
          onRestoreData={handleRestoreData}
          onResetAllData={handleResetAllData}
          onClose={() => setShowBackupModal(false)}
        />
      )}

      {/* Notifications & Sound Settings Modal */}
      {showNotificationSettingsModal && (
        <NotificationSettingsModal
          onTriggerTestNotification={triggerTestNotification}
          onClose={() => setShowNotificationSettingsModal(false)}
        />
      )}

      {/* Install App on Phone & Export Android APK Modal */}
      {showInstallApkModal && (
        <InstallApkModal
          onClose={() => setShowInstallApkModal(false)}
        />
      )}
    </div>
  );
}
