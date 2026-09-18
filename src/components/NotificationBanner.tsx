import React from 'react';
import { Bell, Check, X, Plus } from 'lucide-react';

interface NotificationBannerProps {
  habitName: string;
  habitId: number;
  isCounter?: boolean;
  unit?: string;
  targetCount?: number;
  currentCount?: number;
  onCheckInNow: (habitId: number) => void;
  onStepCountNow?: (habitId: number) => void;
  onDismiss: () => void;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  habitName,
  habitId,
  isCounter,
  unit = '次',
  targetCount = 1,
  currentCount = 0,
  onCheckInNow,
  onStepCountNow,
  onDismiss
}) => {
  return (
    <div
      id="notification-banner"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md bg-zinc-900/95 text-white dark:bg-zinc-800/95 rounded-2xl shadow-2xl border border-zinc-700/60 p-4 backdrop-blur-md animate-in slide-in-from-top-4 duration-300"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
          <Bell className="w-5 h-5 animate-pulse" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              系统定时提醒 (带后台 Action)
            </span>
            <button
              id="dismiss-notification-btn"
              onClick={onDismiss}
              className="text-zinc-400 hover:text-white p-1 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <h4 className="text-sm font-bold text-white mt-0.5 truncate">
            {habitName}
          </h4>
          <p className="text-xs text-zinc-300 mt-0.5">
            {isCounter
              ? `当前进度: ${currentCount}/${targetCount} ${unit}，点击按钮可在后台直接操作`
              : '到设定计划时间了，可在通知栏直接点击完成，无需启动 App 界面'}
          </p>

          <div className="flex items-center gap-2 mt-3">
            {/* 标记完成按钮 */}
            <button
              id="notification-quick-checkin-btn"
              onClick={() => {
                onCheckInNow(habitId);
                onDismiss();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              标记完成
            </button>

            {/* 如果是计数器，提供快捷 +1 按钮 */}
            {isCounter && onStepCountNow && (
              <button
                id="notification-quick-step-btn"
                onClick={() => {
                  onStepCountNow(habitId);
                  onDismiss();
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                +1 {unit}
              </button>
            )}

            <button
              onClick={onDismiss}
              className="px-2.5 py-1.5 text-zinc-400 hover:text-zinc-200 rounded-xl text-xs font-medium transition-colors"
            >
              忽略
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
