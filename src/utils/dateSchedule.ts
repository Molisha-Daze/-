import { Habit } from '../types';
import { parseLocalDate, getLocalDateString } from './streak';

/**
 * Returns ISO day of week: 1 for Monday, 2 for Tuesday, ..., 7 for Sunday
 */
export function getIsoDayOfWeek(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

/**
 * Checks whether a habit is scheduled for a specific date (YYYY-MM-DD)
 */
export function isHabitScheduledForDate(habit: Habit, dateStr: string): boolean {
  if (habit.archived) return false;

  // Check start date (default to today if missing)
  const start = habit.startDate || '2000-01-01';
  if (dateStr < start) {
    return false;
  }

  // Check optional end date
  if (habit.endDate && dateStr > habit.endDate) {
    return false;
  }

  const recurrence = habit.recurrenceType || 'daily';

  if (recurrence === 'none') {
    // Only on start date
    return dateStr === start;
  }

  if (recurrence === 'daily') {
    return true;
  }

  const targetDate = parseLocalDate(dateStr);

  if (recurrence === 'weekly') {
    const isoDay = getIsoDayOfWeek(targetDate);
    const weeklyDays = habit.weeklyDays || [1, 2, 3, 4, 5, 6, 7];
    return weeklyDays.includes(isoDay);
  }

  if (recurrence === 'monthly') {
    const dayOfMonth = targetDate.getDate();
    const monthlyDays = habit.monthlyDays || [1];
    return monthlyDays.includes(dayOfMonth);
  }

  if (recurrence === 'interval') {
    const interval = Math.max(1, habit.intervalDays || 1);
    const startDateObj = parseLocalDate(start);
    const diffTime = targetDate.getTime() - startDateObj.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays % interval === 0;
  }

  return true;
}

export interface CalendarMonthDay {
  date: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
}

/**
 * Generates the full 35 or 42 grid cells for a given month view,
 * where Monday is the first day of the week.
 */
export function generateMonthGrid(year: number, month: number): CalendarMonthDay[] {
  const todayStr = getLocalDateString();
  const firstDayOfMonth = new Date(year, month - 1, 1, 12, 0, 0);
  const lastDayOfMonth = new Date(year, month, 0, 12, 0, 0);

  const daysInMonth = lastDayOfMonth.getDate();
  const startWeekday = getIsoDayOfWeek(firstDayOfMonth); // 1=Mon, 7=Sun

  const cells: CalendarMonthDay[] = [];

  // Previous month padding
  const prevMonthDaysToPad = startWeekday - 1;
  const prevMonthLastDate = new Date(year, month - 1, 0, 12, 0, 0).getDate();

  for (let i = prevMonthDaysToPad - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDate - i;
    const d = new Date(year, month - 2, dayNum, 12, 0, 0);
    const dateStr = getLocalDateString(d);
    cells.push({
      date: dateStr,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isPast: dateStr < todayStr
    });
  }

  // Current month days
  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    const d = new Date(year, month - 1, dayNum, 12, 0, 0);
    const dateStr = getLocalDateString(d);
    cells.push({
      date: dateStr,
      dayNumber: dayNum,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      isPast: dateStr < todayStr
    });
  }

  // Next month padding to complete full 7-day rows (at least 35 or 42 cells)
  const remainingDays = (7 - (cells.length % 7)) % 7;
  for (let dayNum = 1; dayNum <= remainingDays; dayNum++) {
    const d = new Date(year, month, dayNum, 12, 0, 0);
    const dateStr = getLocalDateString(d);
    cells.push({
      date: dateStr,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isPast: dateStr < todayStr
    });
  }

  return cells;
}

export function formatRecurrenceLabel(habit: Habit): string {
  switch (habit.recurrenceType) {
    case 'none':
      return '仅一次';
    case 'daily':
      return '每天';
    case 'weekly': {
      const dayNames = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
      const days = (habit.weeklyDays || []).sort().map((d) => dayNames[d]).join('、');
      return days ? `每周 (${days})` : '每周';
    }
    case 'monthly': {
      const days = (habit.monthlyDays || []).sort((a, b) => a - b).join('、');
      return days ? `每月 (${days}号)` : '每月';
    }
    case 'interval':
      return `每 ${habit.intervalDays || 1} 天`;
    default:
      return '每天';
  }
}
