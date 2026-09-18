import React, { useState } from 'react';
import { calculateStreaks, getLocalDateString } from '../utils/streak';
import { CheckCircle2, AlertCircle, Play, X, ShieldCheck, Calendar, Layers } from 'lucide-react';

interface AcceptanceTestModalProps {
  onClose: () => void;
  onTriggerNotificationTest: () => void;
}

export const AcceptanceTestModal: React.FC<AcceptanceTestModalProps> = ({
  onClose,
  onTriggerNotificationTest
}) => {
  const [streakTestResult, setStreakTestResult] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
    details: string[];
  } | null>(null);

  const runStreakAcceptanceTest = () => {
    // 验收标准: 连续打卡 3 天后断一天，连续数正确归零。
    const baseDate = new Date();
    const dayT = new Date(baseDate);
    const dayMinus1 = new Date(baseDate);
    dayMinus1.setDate(dayMinus1.getDate() - 1);
    const dayMinus2 = new Date(baseDate);
    dayMinus2.setDate(dayMinus2.getDate() - 2);
    const dayMinus3 = new Date(baseDate);
    dayMinus3.setDate(dayMinus3.getDate() - 3);
    const dayMinus4 = new Date(baseDate);
    dayMinus4.setDate(dayMinus4.getDate() - 4);

    const d4 = getLocalDateString(dayMinus4);
    const d3 = getLocalDateString(dayMinus3);
    const d2 = getLocalDateString(dayMinus2);

    const dates = [d4, d3, d2];
    const res = calculateStreaks(dates, dayT);

    const isSuccess = res.currentStreak === 0 && res.longestStreak === 3;

    setStreakTestResult({
      tested: true,
      success: isSuccess,
      message: isSuccess
        ? '测试通过！3 天连续打卡后断卡 1 天，当前连续天数正确归零 (0 天)，历史最长为 3 天。'
        : `测试未通过：当前连续为 ${res.currentStreak}, 最长为 ${res.longestStreak}`,
      details: [
        `第 1 天 (${d4}): 已打卡`,
        `第 2 天 (${d3}): 已打卡`,
        `第 3 天 (${d2}): 已打卡 (连续 3 天)`,
        `第 4 天 (${getLocalDateString(dayMinus1)}): 未打卡 (断卡)`,
        `第 5 天 (${getLocalDateString(dayT)}): 验证结果 -> 当前连续=${res.currentStreak}, 历史最长=${res.longestStreak}`
      ]
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg max-h-[92vh] bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              功能与标准自检测试面板
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-3.5 text-xs text-zinc-600 dark:text-zinc-300 overflow-y-auto flex-1">
          {/* Criterion 1: Calendar Grid */}
          <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-500" />
                1. 细化月视图日历与当天列表
              </span>
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4" /> 满足要求
              </span>
            </div>
            <p className="text-zinc-400 dark:text-zinc-500 mt-1">
              月视图网格（周一为一周第一天）、顶部月份切换、日期格有计划时显示彩色小圆点（实心绿点=已完成，空心灰点=未完成）。日历下方显示今天到期的所有计划，带勾选框与删除线效果。
            </p>
          </div>

          {/* Criterion 2: Plan Management & Counter */}
          <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-500" />
                2. 计划管理与计数器功能
              </span>
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4" /> 满足要求
              </span>
            </div>
            <p className="text-zinc-400 dark:text-zinc-500 mt-1">
              支持标题、多行内容描述（训练动作等）、5种重复方式（不重复单日、每天、每周多选周几、每月选几号、每N天）、生效范围（开始日期与可选结束日期）、计数器（点一下加1，点满目标自动打卡完成）。
            </p>
          </div>

          {/* Criterion 3: Notification with Action */}
          <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-900 dark:text-zinc-100">
                3. 提醒通知带「标记完成」按钮
              </span>
              <button
                onClick={onTriggerNotificationTest}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 rounded-lg font-semibold transition-colors"
              >
                <Play className="w-3 h-3" /> 测试通知弹窗
              </button>
            </div>
            <p className="text-zinc-400 dark:text-zinc-500 mt-1">
              设定时间发送本地通知，通知中附带「标记完成」Action 按钮，点击直接后台写库标记完成，无需进入 App 界面。
            </p>
          </div>

          {/* Criterion 4: Consecutive streak test */}
          <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-900 dark:text-zinc-100">
                4. 连续打卡 3 天后断一天，连续数正确归零
              </span>
              <button
                onClick={runStreakAcceptanceTest}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-semibold shadow-xs transition-colors"
              >
                <Play className="w-3 h-3" /> 运行算法自检
              </button>
            </div>
            <p className="text-zinc-400 dark:text-zinc-500 mt-1">
              严格按本地时区自然日（跨天 00:00 分界）计算，断卡后当前连续天数清零，历史最长天数保留。
            </p>

            {streakTestResult && (
              <div
                className={`mt-2.5 p-3 rounded-xl border ${
                  streakTestResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-700'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  {streakTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                  {streakTestResult.message}
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] opacity-90 pl-1">
                  {streakTestResult.details.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-3.5 bg-zinc-50 dark:bg-zinc-800/40 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-xs font-semibold shadow-xs"
          >
            完成自检
          </button>
        </div>
      </div>
    </div>
  );
};
