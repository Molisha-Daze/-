import React, { useState } from 'react';
import { Habit, CheckIn } from '../types';
import {
  generateMonthGrid,
  isHabitScheduledForDate,
  formatRecurrenceLabel
} from '../utils/dateSchedule';
import { getLocalDateString } from '../utils/streak';
import { getHabitIconComponent } from './HabitCardWeb';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  CheckCircle2,
  Circle,
  Plus,
  Minus,
  Camera,
  Trash2,
  ExternalLink,
  FileText,
  ListTodo,
  Check
} from 'lucide-react';

interface CalendarMonthViewProps {
  habits: Habit[];
  checkIns: CheckIn[];
  onToggleCheckIn: (habitId: number, date: string, targetCount?: number) => void;
  onStepCount: (habitId: number, date: string, targetCount: number, delta: number) => void;
  onToggleSubTask?: (habitId: number, date: string, subTaskId: string, totalSubTasks: number) => void;
  onAttachPhoto: (habitId: number, date: string, file: File) => void;
  onRemovePhoto: (habitId: number, date: string) => void;
  onViewPhoto: (photoUrl: string) => void;
  onOpenDayDetail: (date: string) => void;
}

export const CalendarMonthView: React.FC<CalendarMonthViewProps> = ({
  habits,
  checkIns,
  onToggleCheckIn,
  onStepCount,
  onToggleSubTask,
  onAttachPhoto,
  onRemovePhoto,
  onViewPhoto,
  onOpenDayDetail
}) => {
  const todayStr = getLocalDateString();
  const [todayYear, todayMonth] = todayStr.split('-').map(Number);

  const [currentYear, setCurrentYear] = useState(todayYear);
  const [currentMonth, setCurrentMonth] = useState(todayMonth);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const monthGrid = generateMonthGrid(currentYear, currentMonth);

  // Quick navigation
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear(currentYear - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear(currentYear + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleGoToday = () => {
    setCurrentYear(todayYear);
    setCurrentMonth(todayMonth);
    setSelectedDate(todayStr);
  };

  // Map check-ins by `date_habitId`
  const checkInLookup = new Map<string, CheckIn>();
  for (const c of checkIns) {
    checkInLookup.set(`${c.date}_${c.habitId}`, c);
  }

  // Calculate day status: plans, completed or not
  const getDayStatus = (dateStr: string) => {
    const scheduled = habits.filter((h) => isHabitScheduledForDate(h, dateStr));
    if (scheduled.length === 0) {
      return { hasPlans: false, isAllCompleted: false, count: 0, completedCount: 0 };
    }

    let completed = 0;
    for (const h of scheduled) {
      const c = checkInLookup.get(`${dateStr}_${h.id}`);
      if (c) {
        if (h.isCounter) {
          if ((c.count || 0) >= (h.targetCount || 1)) {
            completed++;
          }
        } else if (c.isCompleted || (c.count || 0) > 0) {
          completed++;
        }
      }
    }

    return {
      hasPlans: true,
      isAllCompleted: completed >= scheduled.length,
      count: scheduled.length,
      completedCount: completed
    };
  };

  // Active plans for selected date (defaults to today)
  const selectedDayScheduledHabits = habits.filter((h) =>
    isHabitScheduledForDate(h, selectedDate)
  );

  const isSelectedToday = selectedDate === todayStr;

  return (
    <div className="space-y-4">
      {/* 1. 日历主界面：月视图网格 */}
      <div
        id="calendar-month-card"
        className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5 shadow-xs"
      >
        {/* Header: Month switch & Today button */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-500" />
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              {currentYear}年 {currentMonth}月
            </h3>
            {(!isSelectedToday || currentYear !== todayYear || currentMonth !== todayMonth) && (
              <button
                id="cal-jump-today-btn"
                onClick={handleGoToday}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
              >
                今日
              </button>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              id="cal-prev-month-btn"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="上个月"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              id="cal-next-month-btn"
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="下个月"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Weekday headers: 周一为一周第一天 */}
        <div className="grid grid-cols-7 gap-1 mb-2 text-center text-xs font-semibold text-zinc-400 dark:text-zinc-500">
          <span>周一</span>
          <span>周二</span>
          <span>周三</span>
          <span>周四</span>
          <span>周五</span>
          <span>周六</span>
          <span className="text-amber-500/80">周日</span>
        </div>

        {/* Month Grid Cells */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {monthGrid.map((day) => {
            const { hasPlans, isAllCompleted, completedCount, count } = getDayStatus(day.date);
            const isSelected = selectedDate === day.date;

            return (
              <button
                key={day.date}
                id={`calendar-day-${day.date}`}
                onClick={() => setSelectedDate(day.date)}
                onDoubleClick={() => onOpenDayDetail(day.date)}
                className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center p-1 transition-all group ${
                  isSelected
                    ? 'ring-2 ring-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40'
                    : day.isToday
                    ? 'bg-zinc-100/80 dark:bg-zinc-800/80'
                    : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                } ${day.isCurrentMonth ? '' : 'opacity-35'}`}
                title={`${day.date} ${hasPlans ? `(计划: ${completedCount}/${count} 完成)` : '无计划'}`}
              >
                {/* Date Number */}
                <span
                  className={`text-xs font-bold leading-none ${
                    day.isToday
                      ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                      : isSelected
                      ? 'text-zinc-900 dark:text-white font-extrabold'
                      : 'text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  {day.dayNumber}
                </span>

                {/* Status Dot: 彩色小圆点（已完成=实心绿点，未完成=空心灰点） */}
                <div className="h-2.5 mt-1 flex items-center justify-center">
                  {hasPlans && (
                    isAllCompleted ? (
                      // 已完成 = 实心绿点
                      <span
                        className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs animate-in zoom-in duration-150"
                        title="已全部完成"
                      />
                    ) : (
                      // 未完成 = 空心灰点
                      <span
                        className="w-2 h-2 rounded-full border-[1.8px] border-zinc-400 dark:border-zinc-500 bg-transparent"
                        title="有未完成计划"
                      />
                    )
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between mt-3.5 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-400 dark:text-zinc-500">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>已完成 (实心绿点)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full border-[1.8px] border-zinc-400 dark:border-zinc-500 bg-transparent" />
              <span>未完成 (空心灰点)</span>
            </div>
          </div>
          <button
            onClick={() => onOpenDayDetail(selectedDate)}
            className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline inline-flex items-center gap-1"
          >
            <span>进入当天详情</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 2. 当天列表：日历下方显示今天/所选日期到期的所有计划 */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>{isSelectedToday ? '今日计划清单' : `${selectedDate} 计划清单`}</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                {selectedDayScheduledHabits.length} 项
              </span>
            </h3>
          </div>

          <button
            id="open-full-day-detail-btn"
            onClick={() => onOpenDayDetail(selectedDate)}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors inline-flex items-center gap-1"
          >
            <span>完整详情</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {selectedDayScheduledHabits.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-400 dark:text-zinc-500">
            {selectedDate} 没有排期中的计划
          </div>
        ) : (
          <div className="space-y-2.5">
            {selectedDayScheduledHabits.map((habit) => {
              const checkIn = checkInLookup.get(`${selectedDate}_${habit.id}`);
              const isCounter = habit.isCounter;
              const targetCount = habit.targetCount || 1;
              const currentCount = checkIn?.count || 0;
              const isCompleted = isCounter
                ? currentCount >= targetCount
                : !!checkIn?.isCompleted || currentCount > 0;
              const IconComp = getHabitIconComponent(habit.iconName);

              return (
                <div
                  key={habit.id}
                  className={`rounded-2xl border transition-all p-3 flex flex-col gap-2 ${
                    isCompleted
                      ? 'bg-emerald-500/5 border-emerald-500/30'
                      : 'bg-zinc-50/50 dark:bg-zinc-800/40 border-zinc-200/80 dark:border-zinc-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    {/* Left: Checkbox + Title with Strikethrough */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Checkbox */}
                      <button
                        id={`list-check-${habit.id}`}
                        onClick={() => onToggleCheckIn(habit.id, selectedDate, targetCount)}
                        className="text-zinc-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors shrink-0"
                        title={isCompleted ? '取消完成' : '标记完成'}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-6 h-6 text-emerald-500 fill-emerald-500/15" />
                        ) : (
                          <Circle className="w-6 h-6 text-zinc-300 dark:text-zinc-600 hover:text-zinc-400" />
                        )}
                      </button>

                      {/* Icon */}
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs"
                        style={{
                          backgroundColor: `${habit.colorHex}18`,
                          color: habit.colorHex
                        }}
                      >
                        <IconComp className="w-4 h-4" />
                      </div>

                      {/* Name with line-through effect */}
                      <div className="min-w-0 flex-1">
                        <span
                          className={`text-xs font-bold block truncate transition-all ${
                            isCompleted
                              ? 'line-through text-zinc-400 dark:text-zinc-500'
                              : 'text-zinc-900 dark:text-zinc-100'
                          }`}
                        >
                          {habit.name}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-400">
                          <span>{formatRecurrenceLabel(habit)}</span>
                          {habit.reminderTime && <span>· 提醒: {habit.reminderTime}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Right: Counter or Actions */}
                    {isCounter ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => onStepCount(habit.id, selectedDate, targetCount, -1)}
                          disabled={currentCount <= 0}
                          className="w-6 h-6 rounded-lg bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-30 text-zinc-700 dark:text-zinc-200 flex items-center justify-center text-xs"
                          title="减少 1"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span
                          className={`text-xs font-bold px-1.5 ${
                            isCompleted
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-zinc-800 dark:text-zinc-200'
                          }`}
                        >
                          {currentCount}/{targetCount} {habit.unit || '次'}
                        </span>
                        <button
                          id={`step-count-btn-${habit.id}`}
                          onClick={() => onStepCount(habit.id, selectedDate, targetCount, 1)}
                          className="px-2 h-6 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-semibold flex items-center gap-0.5 shadow-xs"
                          title="点一下加 1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+1</span>
                        </button>
                      </div>
                    ) : (
                      <div className="shrink-0 flex items-center gap-2">
                        {checkIn?.photoUrl && (
                          <button
                            onClick={() => onViewPhoto(checkIn.photoUrl!)}
                            className="w-7 h-7 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700"
                            title="查看凭证"
                          >
                            <img
                              src={checkIn.photoUrl}
                              alt="凭证"
                              className="w-full h-full object-cover"
                            />
                          </button>
                        )}
                        <label className="cursor-pointer p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800">
                          <Camera className="w-4 h-4" />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) onAttachPhoto(habit.id, selectedDate, f);
                            }}
                          />
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Sub-tasks checklist if present */}
                  {habit.subTasks && habit.subTasks.length > 0 && (
                    <div className="mt-2 p-2 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-500/20 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-purple-700 dark:text-purple-300">
                        <span className="flex items-center gap-1">
                          <ListTodo className="w-3.5 h-3.5" />
                          <span>子任务 ({checkIn?.completedSubTaskIds?.length || 0}/{habit.subTasks.length})</span>
                        </span>
                        <span className="text-[10px] text-zinc-400">点击消除</span>
                      </div>
                      <div className="space-y-1">
                        {habit.subTasks.map((task) => {
                          const isTaskDone = checkIn?.completedSubTaskIds?.includes(task.id);
                          return (
                            <button
                              key={task.id}
                              type="button"
                              onClick={() =>
                                onToggleSubTask?.(
                                  habit.id,
                                  selectedDate,
                                  task.id,
                                  habit.subTasks!.length
                                )
                              }
                              className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg border text-left text-[11px] transition-all ${
                                isTaskDone
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                                  : 'bg-white dark:bg-zinc-800/80 border-zinc-200/70 dark:border-zinc-700/60 text-zinc-800 dark:text-zinc-200'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <div
                                  className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 ${
                                    isTaskDone
                                      ? 'bg-emerald-500 text-white'
                                      : 'border border-zinc-300 dark:border-zinc-600'
                                  }`}
                                >
                                  {isTaskDone && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                </div>
                                <span className={`truncate ${isTaskDone ? 'line-through text-zinc-400' : ''}`}>
                                  {task.title}
                                </span>
                              </div>
                              <span className={`text-[9px] font-bold ${isTaskDone ? 'text-emerald-600' : 'text-zinc-400'}`}>
                                {isTaskDone ? '完成' : '点此完成'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Multi-line training text / description preview if present */}
                  {(!habit.subTasks || habit.subTasks.length === 0) && habit.description && (
                    <div className="text-[11px] bg-white/80 dark:bg-zinc-900/60 p-2 rounded-xl border border-zinc-100 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 whitespace-pre-line leading-relaxed">
                      {habit.description}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
