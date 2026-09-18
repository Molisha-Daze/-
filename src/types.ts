export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'interval';

export interface SubTask {
  id: string;
  title: string; // 细化小计划名称，如 "深蹲 4 组 x 10 次"
  note?: string;
}

export interface Habit {
  id: number;
  name: string;
  description?: string; // 多行内容描述（如训练动作、计划备注）
  iconName: string;
  colorHex: string;
  reminderTime: string | null; // e.g. "08:30"
  sortOrder: number;
  archived: boolean;
  createdAt: number;

  // 计划与重复规则
  recurrenceType: RecurrenceType; // 'none' | 'daily' | 'weekly' | 'monthly' | 'interval'
  startDate: string; // 'YYYY-MM-DD'
  endDate?: string | null; // 'YYYY-MM-DD' | null
  weeklyDays?: number[]; // [1, 2, 3, 4, 5, 6, 7] (1=周一, 7=周日)
  monthlyDays?: number[]; // [1..31]
  intervalDays?: number; // 每 N 天，例如 2, 3

  // 细化大计划功能 (含多个点击消除的小计划)
  isParentPlan?: boolean;
  subTasks?: SubTask[];

  // 计划内目标计数器
  isCounter?: boolean; // 是否启用计数器
  targetCount?: number; // 目标值，例如 3
  unit?: string; // 单位，例如 "杯", "组", "次"
}

export interface CheckIn {
  id: number;
  habitId: number;
  date: string; // "YYYY-MM-DD" local date
  photoUrl?: string; // base64 or object URL
  photoBlob?: Blob;
  note?: string;
  createdAt: number;
  count?: number; // 计数器当前次数
  isCompleted?: boolean; // 是否已完成
  completedSubTaskIds?: string[]; // 当天已点击完成的小计划 ID 列表
}

export interface HabitStats {
  habit: Habit;
  isCompletedToday: boolean;
  todayCheckIn?: CheckIn;
  currentStreak: number;
  longestStreak: number;
  totalCheckIns: number;
  currentCount?: number;
  completedSubTaskCount?: number;
  totalSubTaskCount?: number;
}

export interface DayPlanDetail {
  habit: Habit;
  checkIn?: CheckIn;
  isCompleted: boolean;
  count: number;
  targetCount: number;
}

export interface DayProgress {
  date: string;
  totalHabits: number;
  completedCount: number;
  ratio: number;
  checkIns: CheckIn[];
  isAllCompleted: boolean;
  hasPlans: boolean;
  scheduledHabits: Habit[];
}

// 独立计数器 (无需设定排期与计划，支持自由点击与上限设置，例如记录冰箱里的可乐)
export interface StandaloneCounter {
  id: number;
  name: string; // 例如 "冰箱里的可乐"
  currentCount: number; // 当前计数值
  hasLimit: boolean; // 是否设置上限
  limitCount?: number | null; // 上限值 (如 12 罐)
  unit: string; // 单位，例如 "罐", "杯", "次", "件"
  step: number; // 点击单次增减步长，默认 1
  colorHex: string;
  note?: string; // 备注，例如 "喝一次点一下，随时掌握库存"
  createdAt: number;
  updatedAt: number;
}

