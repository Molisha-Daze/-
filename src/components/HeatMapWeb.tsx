import React, { useState } from 'react';
import { DayProgress } from '../types';

interface HeatMapWebProps {
  progressList: DayProgress[];
}

export const HeatMapWeb: React.FC<HeatMapWebProps> = ({ progressList }) => {
  const [selectedDay, setSelectedDay] = useState<DayProgress | null>(null);

  const getHeatColorClass = (ratio: number) => {
    if (ratio <= 0) return 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-400 dark:text-zinc-600 border border-zinc-200/50 dark:border-zinc-700/50';
    if (ratio < 0.34) return 'bg-emerald-200 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800';
    if (ratio < 0.67) return 'bg-emerald-400 dark:bg-emerald-700 text-white font-bold';
    if (ratio < 1.0) return 'bg-emerald-600 dark:bg-emerald-600 text-white font-bold';
    return 'bg-emerald-700 dark:bg-emerald-500 text-white font-bold shadow-xs';
  };

  const daysOfWeek = ['一', '二', '三', '四', '五', '六', '日'];

  return (
    <div id="heatmap-container" className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
          打卡热力图 (近 35 天)
        </h3>
        {selectedDay ? (
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            {selectedDay.date}：{selectedDay.completedCount}/{selectedDay.totalHabits} 项完成 ({Math.round(selectedDay.ratio * 100)}%)
          </span>
        ) : (
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            点击方格查看日期完成度
          </span>
        )}
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1.5 mb-1.5 text-center">
        {daysOfWeek.map((d, i) => (
          <span key={i} className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
            周{d}
          </span>
        ))}
      </div>

      {/* 35 Days Grid (7 columns x 5 rows) */}
      <div className="grid grid-cols-7 gap-1.5">
        {progressList.map((day) => {
          const dayNum = day.date.split('-')[2];
          const isSelected = selectedDay?.date === day.date;
          return (
            <button
              key={day.date}
              id={`heat-day-${day.date}`}
              onClick={() => setSelectedDay(day)}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-transform active:scale-95 ${getHeatColorClass(
                day.ratio
              )} ${isSelected ? 'ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-zinc-900' : ''}`}
            >
              <span className="leading-none text-[11px]">{parseInt(dayNum, 10)}</span>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1.5 mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-400 dark:text-zinc-500">
        <span>低</span>
        <span className="w-3 h-3 rounded-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700" />
        <span className="w-3 h-3 rounded-sm bg-emerald-200 dark:bg-emerald-950" />
        <span className="w-3 h-3 rounded-sm bg-emerald-400 dark:bg-emerald-700" />
        <span className="w-3 h-3 rounded-sm bg-emerald-600 dark:bg-emerald-600" />
        <span className="w-3 h-3 rounded-sm bg-emerald-700 dark:bg-emerald-500" />
        <span>高 (100%)</span>
      </div>
    </div>
  );
};
