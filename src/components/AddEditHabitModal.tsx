import React, { useState } from 'react';
import { Habit, RecurrenceType, SubTask } from '../types';
import { getLocalDateString } from '../utils/streak';
import {
  X,
  Activity,
  BookOpen,
  Droplet,
  Dumbbell,
  Sparkles,
  Bike,
  Moon,
  Star,
  Clock,
  Calendar,
  Layers,
  CheckSquare2,
  FileText,
  ListTodo,
  Plus,
  Trash2,
  Check
} from 'lucide-react';

interface AddEditHabitModalProps {
  initialHabit?: Habit | null;
  onClose: () => void;
  onSave: (habitData: {
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
    isParentPlan?: boolean;
    subTasks?: SubTask[];
    isCounter?: boolean;
    targetCount?: number;
    unit?: string;
  }) => void;
}

const PRESET_ICONS = [
  { key: 'Run', label: '运动', icon: Activity },
  { key: 'Book', label: '阅读', icon: BookOpen },
  { key: 'Water', label: '喝水', icon: Droplet },
  { key: 'Fitness', label: '训练', icon: Dumbbell },
  { key: 'Meditation', label: '冥想', icon: Sparkles },
  { key: 'Bike', label: '骑行', icon: Bike },
  { key: 'Sleep', label: '早睡', icon: Moon },
  { key: 'Star', label: '常用', icon: Star }
];

const PRESET_COLORS = [
  { hex: '#10B981', name: '翡翠绿' },
  { hex: '#3B82F6', name: '海蓝色' },
  { hex: '#8B5CF6', name: '幻紫色' },
  { hex: '#F59E0B', name: '琥珀橙' },
  { hex: '#EC4899', name: '玫瑰粉' },
  { hex: '#14B8A6', name: '青碧色' }
];

const WEEKDAY_OPTIONS = [
  { day: 1, label: '周一' },
  { day: 2, label: '周二' },
  { day: 3, label: '周三' },
  { day: 4, label: '周四' },
  { day: 5, label: '周五' },
  { day: 6, label: '周六' },
  { day: 7, label: '周日' }
];

export const AddEditHabitModal: React.FC<AddEditHabitModalProps> = ({
  initialHabit,
  onClose,
  onSave
}) => {
  const todayStr = getLocalDateString();

  const [name, setName] = useState(initialHabit?.name || '');
  const [description, setDescription] = useState(initialHabit?.description || '');
  const [selectedIcon, setSelectedIcon] = useState(initialHabit?.iconName || 'Star');
  const [selectedColor, setSelectedColor] = useState(initialHabit?.colorHex || '#10B981');
  const [reminderTime, setReminderTime] = useState<string>(initialHabit?.reminderTime || '');

  // Recurrence
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>(
    initialHabit?.recurrenceType || 'daily'
  );
  const [weeklyDays, setWeeklyDays] = useState<number[]>(
    initialHabit?.weeklyDays || [1, 2, 3, 4, 5, 6, 7]
  );
  const [monthlyDay, setMonthlyDay] = useState<number>(
    initialHabit?.monthlyDays?.[0] || 1
  );
  const [intervalDays, setIntervalDays] = useState<number>(
    initialHabit?.intervalDays || 2
  );

  // 大计划与细化小计划 (Parent Plan & Sub-tasks)
  const [isParentPlan, setIsParentPlan] = useState<boolean>(
    initialHabit?.isParentPlan || false
  );
  const [subTasks, setSubTasks] = useState<SubTask[]>(
    initialHabit?.subTasks || []
  );
  const [newSubTaskInput, setNewSubTaskInput] = useState('');

  // Effective Range
  const [startDate, setStartDate] = useState<string>(
    initialHabit?.startDate || todayStr
  );
  const [hasEndDate, setHasEndDate] = useState<boolean>(!!initialHabit?.endDate);
  const [endDate, setEndDate] = useState<string>(
    initialHabit?.endDate || todayStr
  );

  // Counter mode
  const [isCounter, setIsCounter] = useState<boolean>(
    initialHabit?.isCounter || false
  );
  const [targetCount, setTargetCount] = useState<number>(
    initialHabit?.targetCount || 3
  );
  const [unit, setUnit] = useState<string>(initialHabit?.unit || '杯');

  const [error, setError] = useState('');

  const toggleWeekday = (day: number) => {
    if (weeklyDays.includes(day)) {
      if (weeklyDays.length > 1) {
        setWeeklyDays(weeklyDays.filter((d) => d !== day));
      }
    } else {
      setWeeklyDays([...weeklyDays, day].sort());
    }
  };

  const handleAddSubTask = () => {
    if (!newSubTaskInput.trim()) return;
    const newId = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setSubTasks([...subTasks, { id: newId, title: newSubTaskInput.trim() }]);
    setNewSubTaskInput('');
  };

  const handleRemoveSubTask = (id: string) => {
    setSubTasks(subTasks.filter((s) => s.id !== id));
  };

  const handleApplyFitnessTemplate = () => {
    setName('力量与体能训练');
    setSelectedIcon('Fitness');
    setSelectedColor('#8B5CF6');
    setIsParentPlan(true);
    setSubTasks([
      { id: `sub-squat-${Date.now()}`, title: '深蹲 4 组 x 10 次' },
      { id: `sub-bench-${Date.now()}`, title: '卧推 4 组 x 10 次' },
      { id: `sub-pullup-${Date.now()}`, title: '引体向上 3 组 x 8 次' },
      { id: `sub-stretch-${Date.now()}`, title: '肌肉静态拉伸 10 分钟' }
    ]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('请输入计划/习惯标题');
      return;
    }

    onSave({
      name: name.trim(),
      description: description.trim() ? description.trim() : undefined,
      iconName: selectedIcon,
      colorHex: selectedColor,
      reminderTime: reminderTime.trim() ? reminderTime.trim() : null,
      recurrenceType,
      startDate: startDate || todayStr,
      endDate: hasEndDate && endDate ? endDate : null,
      weeklyDays: recurrenceType === 'weekly' ? weeklyDays : undefined,
      monthlyDays: recurrenceType === 'monthly' ? [monthlyDay] : undefined,
      intervalDays: recurrenceType === 'interval' ? Math.max(1, intervalDays) : undefined,
      isParentPlan,
      subTasks: isParentPlan ? subTasks : undefined,
      isCounter: !isParentPlan ? isCounter : false,
      targetCount: isCounter && !isParentPlan ? Math.max(1, targetCount) : undefined,
      unit: isCounter && !isParentPlan ? (unit.trim() || '次') : undefined
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="add-edit-habit-dialog"
        className="w-full max-w-lg max-h-[92vh] bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0 bg-zinc-50/50 dark:bg-zinc-800/30">
          <div className="flex items-center gap-2">
            <CheckSquare2 className="w-5 h-5 text-emerald-500" />
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              {initialHabit ? '编辑计划 / 习惯' : '新增计划与习惯'}
            </h2>
          </div>
          <button
            id="close-habit-modal"
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable form body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* 计划模式选择：常规计划 vs 大计划 (包含点击消除的小任务) */}
          <div className="bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-2xl flex items-center gap-1">
            <button
              type="button"
              id="select-normal-plan-btn"
              onClick={() => setIsParentPlan(false)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                !isParentPlan
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <CheckSquare2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>常规单项计划</span>
            </button>
            <button
              type="button"
              id="select-parent-plan-btn"
              onClick={() => setIsParentPlan(true)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                isParentPlan
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <ListTodo className="w-3.5 h-3.5 text-purple-500" />
              <span>新建大计划 (细化任务消除)</span>
            </button>
          </div>

          {/* 1. 标题 (Name) */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              {isParentPlan ? '大计划标题' : '计划标题'} <span className="text-red-500">*</span>
            </label>
            <input
              id="habit-name-input"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder={isParentPlan ? "例如：力量与体能训练、清晨全套习惯" : "例如：今日喝水打卡、晨跑 3 公里"}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              maxLength={40}
              autoFocus
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>

          {/* 如果是大计划，展示细化小计划列表配置 */}
          {isParentPlan && (
            <div className="bg-purple-50/50 dark:bg-purple-950/20 rounded-2xl p-4 border border-purple-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListTodo className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <div>
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      子任务清单 ({subTasks.length} 项)
                    </span>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      主页点击展开，每做完一项点击消除
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleApplyFitnessTemplate}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 hover:bg-purple-200 font-medium transition-colors"
                >
                  填入力量训练示例
                </button>
              </div>

              {/* 小计划添加输入框 */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newSubTaskInput}
                  onChange={(e) => setNewSubTaskInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSubTask();
                    }
                  }}
                  placeholder="输入小计划名称，如：深蹲 4 组 x 10 次"
                  className="flex-1 px-3 py-2 rounded-xl border border-purple-200 dark:border-purple-800 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="button"
                  id="add-subtask-btn"
                  onClick={handleAddSubTask}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1 shadow-xs transition-all active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>添加</span>
                </button>
              </div>

              {/* 已有小计划列表 */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {subTasks.length === 0 ? (
                  <p className="text-xs text-zinc-400 py-3 text-center">
                    暂未添加小计划，请在上方输入动作后点击“添加”，或直接使用右上角示例
                  </p>
                ) : (
                  subTasks.map((task, idx) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-white dark:bg-zinc-800/90 border border-purple-200/50 dark:border-purple-900/40 text-xs text-zinc-800 dark:text-zinc-200 shadow-2xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-4 h-4 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="truncate">{task.title}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubTask(task.id)}
                        className="p-1 rounded-md text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"
                        title="删除此小计划"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 2. 内容描述 (Description - 支持多行训练内容) */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-zinc-400" />
                内容描述 (多行文本，如训练动作/备忘)
              </span>
              <span className="text-[11px] text-zinc-400 font-normal">可选</span>
            </label>
            <textarea
              id="habit-description-input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例如：&#10;深蹲 4 组 x 10 次&#10;卧推 4 组 x 10 次&#10;引体向上 3 组 x 8 次&#10;静态拉伸 10 分钟"
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono leading-relaxed"
            />
          </div>

          {/* 3. 计数器功能 (与打卡结合，仅常规计划可用) */}
          {!isParentPlan && (
            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl p-3.5 border border-emerald-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      开启目标计数器
                    </span>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      例如：今日喝水量 3 杯，点一下加 1，点满 3 次目标完成
                    </p>
                  </div>
                </div>
                <input
                  id="habit-counter-toggle"
                  type="checkbox"
                  checked={isCounter}
                  onChange={(e) => setIsCounter(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500 cursor-pointer"
                />
              </div>

              {isCounter && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-emerald-500/15">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                      目标达成数值
                    </label>
                    <input
                      id="habit-target-count-input"
                    type="number"
                    min={1}
                    max={999}
                    value={targetCount}
                    onChange={(e) => setTargetCount(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    计数单位
                  </label>
                  <input
                    id="habit-unit-input"
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="如：杯、组、次、km"
                    className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
                    maxLength={6}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. 重复方式 (Recurrence) */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              重复方式
            </label>
            <div className="grid grid-cols-5 gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-xs font-medium">
              {(
                [
                  { type: 'none', label: '仅当天' },
                  { type: 'daily', label: '每天' },
                  { type: 'weekly', label: '每周' },
                  { type: 'monthly', label: '每月' },
                  { type: 'interval', label: '每N天' }
                ] as const
              ).map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setRecurrenceType(item.type)}
                  className={`py-1.5 rounded-lg text-center transition-colors ${
                    recurrenceType === item.type
                      ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Weekly sub-options: Mon to Sun multi-select */}
            {recurrenceType === 'weekly' && (
              <div className="mt-2.5 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
                <span className="block text-[11px] font-semibold text-zinc-500 mb-2">
                  选择每周重复日 (可多选)：
                </span>
                <div className="grid grid-cols-7 gap-1">
                  {WEEKDAY_OPTIONS.map((w) => {
                    const isSelected = weeklyDays.includes(w.day);
                    return (
                      <button
                        key={w.day}
                        type="button"
                        onClick={() => toggleWeekday(w.day)}
                        className={`py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          isSelected
                            ? 'bg-emerald-500 text-white shadow-xs'
                            : 'bg-white dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-600'
                        }`}
                      >
                        {w.label.replace('周', '')}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Monthly sub-options: Day of Month */}
            {recurrenceType === 'monthly' && (
              <div className="mt-2.5 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200/60 dark:border-zinc-800 flex items-center gap-3">
                <span className="text-xs text-zinc-600 dark:text-zinc-400">每月固定日期:</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={monthlyDay}
                    onChange={(e) => setMonthlyDay(parseInt(e.target.value) || 1)}
                    className="w-16 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-center"
                  />
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">号</span>
                </div>
              </div>
            )}

            {/* Interval sub-options: Every N days */}
            {recurrenceType === 'interval' && (
              <div className="mt-2.5 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200/60 dark:border-zinc-800 flex items-center gap-3">
                <span className="text-xs text-zinc-600 dark:text-zinc-400">循环间隔:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-zinc-500">每</span>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={intervalDays}
                    onChange={(e) => setIntervalDays(parseInt(e.target.value) || 1)}
                    className="w-16 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-center"
                  />
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">天执行一次</span>
                </div>
              </div>
            )}
          </div>

          {/* 5. 生效范围 (Start Date & Optional End Date) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                开始日期
              </label>
              <input
                id="habit-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                  结束日期
                </label>
                <label className="inline-flex items-center gap-1 text-[11px] text-zinc-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasEndDate}
                    onChange={(e) => setHasEndDate(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>指定结束</span>
                </label>
              </div>

              {hasEndDate ? (
                <input
                  id="habit-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100"
                />
              ) : (
                <div className="w-full px-3 py-2 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700 text-xs text-zinc-400 bg-zinc-50/50 dark:bg-zinc-800/30">
                  长期有效 (未设结束日)
                </div>
              )}
            </div>
          </div>

          {/* 6. 提醒时间 (可选) */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              提醒时间 (可选，不设就不提醒)
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  id="habit-reminder-input"
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              {reminderTime && (
                <button
                  type="button"
                  onClick={() => setReminderTime('')}
                  className="px-2.5 py-2 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  清除
                </button>
              )}
            </div>
          </div>

          {/* 7. 图标与主题色 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Icon */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                图标
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {PRESET_ICONS.map((item) => {
                  const IconComp = item.icon;
                  const isSelected = selectedIcon === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setSelectedIcon(item.key)}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all text-[11px] ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
                          : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      <IconComp className="w-4 h-4 mb-0.5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                主题色
              </label>
              <div className="flex items-center gap-2.5 pt-1">
                {PRESET_COLORS.map((c) => {
                  const isSelected = selectedColor === c.hex;
                  return (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setSelectedColor(c.hex)}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        isSelected
                          ? 'scale-110 ring-3 ring-zinc-900 dark:ring-white ring-offset-2 dark:ring-offset-zinc-900'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              取消
            </button>
            <button
              id="save-habit-btn"
              type="submit"
              className="px-5 py-2 text-xs font-semibold rounded-xl text-white shadow-sm transition-all hover:opacity-95 active:scale-95"
              style={{ backgroundColor: selectedColor }}
            >
              保存计划
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
