import React, { useRef, useState } from 'react';
import { HabitStats } from '../types';
import { formatRecurrenceLabel } from '../utils/dateSchedule';
import {
  Check,
  Flame,
  Camera,
  Trash2,
  Bell,
  Activity,
  BookOpen,
  Droplet,
  Dumbbell,
  Sparkles,
  Bike,
  Moon,
  Star,
  Plus,
  Minus,
  FileText,
  ListTodo,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle
} from 'lucide-react';

interface HabitCardWebProps {
  item: HabitStats;
  onToggle: () => void;
  onStepCount?: (delta: number) => void;
  onToggleSubTask?: (subTaskId: string) => void;
  onAttachPhoto: (file: File) => void;
  onRemovePhoto: () => void;
  onViewPhoto: (photoUrl: string) => void;
}

export function getHabitIconComponent(iconName: string) {
  switch (iconName) {
    case 'Run':
      return Activity;
    case 'Book':
      return BookOpen;
    case 'Water':
      return Droplet;
    case 'Fitness':
      return Dumbbell;
    case 'Meditation':
      return Sparkles;
    case 'Bike':
      return Bike;
    case 'Sleep':
      return Moon;
    default:
      return Star;
  }
}

export const HabitCardWeb: React.FC<HabitCardWebProps> = ({
  item,
  onToggle,
  onStepCount,
  onToggleSubTask,
  onAttachPhoto,
  onRemovePhoto,
  onViewPhoto
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { habit, isCompletedToday, todayCheckIn, currentStreak, longestStreak } = item;
  const IconComponent = getHabitIconComponent(habit.iconName);

  const [isSubTasksExpanded, setIsSubTasksExpanded] = useState<boolean>(true);

  const isCounter = habit.isCounter;
  const targetCount = habit.targetCount || 1;
  const currentCount = todayCheckIn?.count || 0;

  const hasSubTasks =
    (habit.isParentPlan || (habit.subTasks && habit.subTasks.length > 0)) &&
    habit.subTasks &&
    habit.subTasks.length > 0;
  const subTasks = habit.subTasks || [];
  const completedSubTaskIds = todayCheckIn?.completedSubTaskIds || [];
  const completedSubTasksCount = completedSubTaskIds.length;
  const totalSubTasksCount = subTasks.length;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onAttachPhoto(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div
      id={`habit-card-${habit.id}`}
      className={`relative overflow-hidden rounded-2xl border transition-all duration-200 p-4 ${
        isCompletedToday
          ? 'bg-emerald-500/5 border-emerald-500/30 shadow-xs'
          : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left: Icon & Details */}
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs cursor-pointer"
            onClick={() => hasSubTasks && setIsSubTasksExpanded(!isSubTasksExpanded)}
            style={{
              backgroundColor: `${habit.colorHex}18`,
              color: habit.colorHex
            }}
          >
            <IconComponent className="w-6 h-6" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3
                onClick={() => hasSubTasks && setIsSubTasksExpanded(!isSubTasksExpanded)}
                className={`font-semibold text-base truncate transition-all ${
                  hasSubTasks ? 'cursor-pointer hover:underline' : ''
                } ${
                  isCompletedToday
                    ? 'line-through text-zinc-400 dark:text-zinc-500'
                    : 'text-zinc-900 dark:text-zinc-100'
                }`}
              >
                {habit.name}
              </h3>

              {hasSubTasks && (
                <button
                  type="button"
                  onClick={() => setIsSubTasksExpanded(!isSubTasksExpanded)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-colors"
                >
                  <span>{completedSubTasksCount}/{totalSubTasksCount}项</span>
                  {isSubTasksExpanded ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
              )}
            </div>

            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1 text-xs">
              <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />
                <span>连续 {currentStreak} 天</span>
              </span>

              <span className="text-zinc-400 dark:text-zinc-500">
                最长 {longestStreak} 天
              </span>

              <span className="text-zinc-400 text-xs">
                {formatRecurrenceLabel(habit)}
              </span>

              {habit.reminderTime && (
                <span className="inline-flex items-center gap-1 text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md text-[11px]">
                  <Bell className="w-3 h-3 text-zinc-400 shrink-0" />
                  <span>{habit.reminderTime}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Toggle Check-in or Counter Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {isCounter && onStepCount ? (
            <div className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-800/60 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <button
                onClick={() => onStepCount(-1)}
                disabled={currentCount <= 0}
                className="w-7 h-7 rounded-lg bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-30 text-zinc-700 dark:text-zinc-200 flex items-center justify-center text-xs"
                title="减 1"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="px-1.5 text-xs font-bold text-zinc-800 dark:text-zinc-200 min-w-10 text-center">
                {currentCount}/{targetCount}
              </span>
              <button
                id={`card-plus-btn-${habit.id}`}
                onClick={() => onStepCount(1)}
                className="px-2 h-7 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-0.5 shadow-xs"
                title="点一下加 1"
              >
                <Plus className="w-3 h-3" />
                <span>+1</span>
              </button>
            </div>
          ) : null}

          <button
            id={`checkin-btn-${habit.id}`}
            onClick={onToggle}
            aria-label={isCompletedToday ? '取消打卡' : '完成打卡'}
            className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 ${
              isCompletedToday
                ? 'text-white shadow-sm'
                : 'border-2 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
            style={{
              backgroundColor: isCompletedToday ? habit.colorHex : 'transparent',
              borderColor: isCompletedToday ? habit.colorHex : habit.colorHex
            }}
            title={hasSubTasks ? '点击切换整组完成状态' : '点击打卡'}
          >
            {isCompletedToday ? (
              <Check className="w-6 h-6 stroke-[3]" />
            ) : (
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: `${habit.colorHex}30` }}
              />
            )}
          </button>
        </div>
      </div>

      {/* Interactive Sub-tasks list for parent plan */}
      {hasSubTasks && isSubTasksExpanded && (
        <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
          {/* Progress bar */}
          <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${totalSubTasksCount > 0 ? (completedSubTasksCount / totalSubTasksCount) * 100 : 0}%`,
                backgroundColor: habit.colorHex
              }}
            />
          </div>

          {/* Sub-tasks list */}
          <div className="space-y-1.5">
            {subTasks.map((task) => {
              const isTaskDone = completedSubTaskIds.includes(task.id);
              return (
                <button
                  key={task.id}
                  id={`subtask-item-${habit.id}-${task.id}`}
                  onClick={() => onToggleSubTask?.(task.id)}
                  type="button"
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border transition-all text-left group ${
                    isTaskDone
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                      : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200/70 dark:border-zinc-700/60 hover:border-zinc-300 text-zinc-800 dark:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                        isTaskDone
                          ? 'bg-emerald-500 text-white shadow-2xs'
                          : 'border border-zinc-300 dark:border-zinc-600 group-hover:border-zinc-400 bg-white dark:bg-zinc-700'
                      }`}
                    >
                      {isTaskDone ? (
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-zinc-400" />
                      )}
                    </div>
                    <span
                      className={`text-xs font-medium transition-all truncate leading-normal ${
                        isTaskDone
                          ? 'line-through text-zinc-400 dark:text-zinc-500'
                          : 'text-zinc-800 dark:text-zinc-200'
                      }`}
                    >
                      {task.title}
                    </span>
                  </div>

                  <span
                    className={`text-[11px] shrink-0 font-medium ml-2 ${
                      isTaskDone
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300'
                    }`}
                  >
                    {isTaskDone ? '已完成' : '待完成'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Description text if present and not a parent plan (to avoid redundant lines) */}
      {!hasSubTasks && habit.description && (
        <div className="mt-2.5 text-xs bg-zinc-50 dark:bg-zinc-800/40 p-2 rounded-xl border border-zinc-100 dark:border-zinc-800/60 text-zinc-600 dark:text-zinc-400 whitespace-pre-line leading-relaxed">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400 mb-0.5">
            <FileText className="w-3 h-3" />
            <span>训练 / 计划内容</span>
          </div>
          {habit.description}
        </div>
      )}

      {/* Proof Photo Attachment Row (Available when completed or checking in) */}
      {isCompletedToday && (
        <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-2">
            {todayCheckIn?.photoUrl ? (
              <div className="flex items-center gap-2">
                <button
                  id={`view-photo-${habit.id}`}
                  onClick={() => onViewPhoto(todayCheckIn.photoUrl!)}
                  className="relative group w-10 h-10 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 focus:outline-none"
                  title="点击查看大图"
                >
                  <img
                    src={todayCheckIn.photoUrl}
                    alt="打卡凭证"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center text-white opacity-0 group-hover:opacity-100">
                    <span className="text-[10px]">查看</span>
                  </div>
                </button>
                <span className="text-zinc-600 dark:text-zinc-300 font-medium text-[11px]">
                  拍照凭证已留存
                </span>
                <button
                  id={`delete-photo-${habit.id}`}
                  onClick={onRemovePhoto}
                  className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors"
                  title="移除此照片"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <span className="text-[11px]">可附带一张照片作为今日完成凭证</span>
            )}
          </div>

          <div>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              id={`upload-photo-${habit.id}`}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-medium transition-colors text-xs"
            >
              <Camera className="w-3.5 h-3.5" style={{ color: habit.colorHex }} />
              {todayCheckIn?.photoUrl ? '更换凭证' : '拍照留证'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
