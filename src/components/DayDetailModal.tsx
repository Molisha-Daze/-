import React from 'react';
import { Habit, CheckIn } from '../types';
import { getHabitIconComponent } from './HabitCardWeb';
import { formatRecurrenceLabel } from '../utils/dateSchedule';
import {
  X,
  CheckCircle2,
  Circle,
  Plus,
  Minus,
  Camera,
  Trash2,
  Calendar,
  FileText,
  ListTodo,
  Check
} from 'lucide-react';

interface DayDetailModalProps {
  date: string; // YYYY-MM-DD
  habits: Habit[];
  checkIns: CheckIn[];
  onClose: () => void;
  onToggleCheckIn: (habitId: number, date: string, targetCount?: number) => void;
  onStepCount: (habitId: number, date: string, targetCount: number, delta: number) => void;
  onToggleSubTask?: (habitId: number, date: string, subTaskId: string, totalSubTasks: number) => void;
  onAttachPhoto: (habitId: number, date: string, file: File) => void;
  onRemovePhoto: (habitId: number, date: string) => void;
  onViewPhoto: (photoUrl: string) => void;
}

export const DayDetailModal: React.FC<DayDetailModalProps> = ({
  date,
  habits,
  checkIns,
  onClose,
  onToggleCheckIn,
  onStepCount,
  onToggleSubTask,
  onAttachPhoto,
  onRemovePhoto,
  onViewPhoto
}) => {
  const [y, m, d] = date.split('-');
  const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d), 12);
  const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const weekdayStr = weekdayNames[dateObj.getDay()];

  // Filter check-ins for this date
  const dayCheckInMap = new Map<number, CheckIn>();
  for (const c of checkIns) {
    if (c.date === date) {
      dayCheckInMap.set(c.habitId, c);
    }
  }

  const completedCount = habits.filter((h) => {
    const c = dayCheckInMap.get(h.id);
    if (!c) return false;
    if (h.isCounter) {
      return (c.count || 0) >= (h.targetCount || 1);
    }
    return !!c.isCompleted || c.count !== undefined;
  }).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="day-detail-dialog"
        className="w-full max-w-lg max-h-[90vh] bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-500" />
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {y}年{m}月{d}日 · {weekdayStr}
              </h2>
            </div>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
              当天计划完成进度：{completedCount} / {habits.length} 项
            </p>
          </div>

          <button
            id="close-day-detail-btn"
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {habits.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 text-xs">
              当天没有安排任何计划项目
            </div>
          ) : (
            habits.map((habit) => {
              const checkIn = dayCheckInMap.get(habit.id);
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
                  className={`rounded-2xl border transition-all p-3.5 ${
                    isCompleted
                      ? 'bg-emerald-500/5 border-emerald-500/30'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button
                      id={`day-detail-toggle-${habit.id}`}
                      onClick={() => onToggleCheckIn(habit.id, date, targetCount)}
                      className="mt-0.5 text-zinc-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors shrink-0"
                      title={isCompleted ? '取消打卡' : '标记完成'}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-500 fill-emerald-500/10" />
                      ) : (
                        <Circle className="w-6 h-6 text-zinc-300 dark:text-zinc-600" />
                      )}
                    </button>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs"
                          style={{
                            backgroundColor: `${habit.colorHex}18`,
                            color: habit.colorHex
                          }}
                        >
                          <IconComp className="w-4 h-4" />
                        </div>
                        <h3
                          className={`text-sm font-semibold transition-all ${
                            isCompleted
                              ? 'line-through text-zinc-400 dark:text-zinc-500'
                              : 'text-zinc-900 dark:text-zinc-100'
                          }`}
                        >
                          {habit.name}
                        </h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                          {formatRecurrenceLabel(habit)}
                        </span>
                      </div>

                      {/* Sub-tasks interactive list for 大计划 */}
                      {habit.subTasks && habit.subTasks.length > 0 && (
                        <div className="mt-2.5 p-2.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-500/20 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5 font-bold text-purple-700 dark:text-purple-300">
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
                                      date,
                                      task.id,
                                      habit.subTasks!.length
                                    )
                                  }
                                  className={`w-full flex items-center justify-between p-2 rounded-lg border text-left text-xs transition-all ${
                                    isTaskDone
                                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                                      : 'bg-white dark:bg-zinc-800/80 border-zinc-200/70 dark:border-zinc-700/60 text-zinc-800 dark:text-zinc-200'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div
                                      className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                                        isTaskDone
                                          ? 'bg-emerald-500 text-white'
                                          : 'border border-zinc-300 dark:border-zinc-600'
                                      }`}
                                    >
                                      {isTaskDone && <Check className="w-3 h-3 stroke-[3]" />}
                                    </div>
                                    <span
                                      className={`truncate ${
                                        isTaskDone ? 'line-through text-zinc-400' : ''
                                      }`}
                                    >
                                      {task.title}
                                    </span>
                                  </div>
                                  <span
                                    className={`text-[10px] font-bold ${
                                      isTaskDone
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-zinc-400'
                                    }`}
                                  >
                                    {isTaskDone ? '已达成' : '点击完成'}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Multi-line Description (e.g. Training sets) if not a parent plan */}
                      {(!habit.subTasks || habit.subTasks.length === 0) && habit.description && (
                        <div className="mt-2 text-xs bg-zinc-50 dark:bg-zinc-800/60 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800/80 text-zinc-600 dark:text-zinc-300 whitespace-pre-line leading-relaxed">
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400 mb-1">
                            <FileText className="w-3 h-3" />
                            <span>计划内容详情</span>
                          </div>
                          {habit.description}
                        </div>
                      )}

                      {/* Counter Controls */}
                      {isCounter && (
                        <div className="mt-2.5 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/40 px-3 py-1.5 rounded-xl border border-zinc-200/60 dark:border-zinc-700/50">
                          <div className="text-xs">
                            <span className="text-zinc-400 mr-1.5">计数进度:</span>
                            <span
                              className={`font-bold ${
                                isCompleted
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-zinc-800 dark:text-zinc-200'
                              }`}
                            >
                              {currentCount} / {targetCount} {habit.unit || '次'}
                            </span>
                            {isCompleted && (
                              <span className="ml-2 text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-md">
                                目标达成
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => onStepCount(habit.id, date, targetCount, -1)}
                              disabled={currentCount <= 0}
                              className="w-7 h-7 rounded-lg bg-zinc-200/80 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-30 text-zinc-700 dark:text-zinc-200 flex items-center justify-center transition-colors"
                              title="减少1"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onStepCount(habit.id, date, targetCount, 1)}
                              className="px-2.5 h-7 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
                              title="点一下加1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>+1 {habit.unit || '次'}</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Photo attachment */}
                      <div className="mt-2.5 flex items-center justify-between text-xs pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                        {checkIn?.photoUrl ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onViewPhoto(checkIn.photoUrl!)}
                              className="w-9 h-9 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 hover:opacity-90"
                              title="点击查看大图"
                            >
                              <img
                                src={checkIn.photoUrl}
                                alt="凭证"
                                className="w-full h-full object-cover"
                              />
                            </button>
                            <span className="text-zinc-500 text-[11px]">打卡拍照凭证</span>
                            <button
                              onClick={() => onRemovePhoto(habit.id, date)}
                              className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded"
                              title="删除照片"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-zinc-400">
                            {isCompleted ? '已完成，可补充照片凭证' : '尚未打卡'}
                          </span>
                        )}

                        <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[11px] font-medium transition-colors">
                          <Camera className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{checkIn?.photoUrl ? '更换照片' : '添加照片'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) onAttachPhoto(habit.id, date, f);
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-end bg-zinc-50/50 dark:bg-zinc-800/30">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            完成查看
          </button>
        </div>
      </div>
    </div>
  );
};
