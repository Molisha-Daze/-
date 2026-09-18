import React, { useState } from 'react';
import { X, Bell, Volume2, Vibrate, Clock, Play } from 'lucide-react';

interface NotificationSettingsModalProps {
  onTriggerTestNotification: () => void;
  onClose: () => void;
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  onTriggerTestNotification,
  onClose
}) => {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('app_sound_enabled') !== 'false';
  });
  const [vibrateEnabled, setVibrateEnabled] = useState(() => {
    return localStorage.getItem('app_vibrate_enabled') !== 'false';
  });
  const [dailyReviewTime, setDailyReviewTime] = useState(() => {
    return localStorage.getItem('app_daily_review_time') || '21:00';
  });

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('app_sound_enabled', String(next));
    if (next) {
      // Play a gentle audio tone preview
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
      } catch {
        // ignore
      }
    }
  };

  const toggleVibrate = () => {
    const next = !vibrateEnabled;
    setVibrateEnabled(next);
    localStorage.setItem('app_vibrate_enabled', String(next));
    if (next && navigator.vibrate) {
      navigator.vibrate(30);
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = e.target.value;
    setDailyReviewTime(time);
    localStorage.setItem('app_daily_review_time', time);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                提醒与声音设置
              </h3>
              <p className="text-[11px] text-zinc-400">
                打卡音效、震动反馈与每日提醒
              </p>
            </div>
          </div>
          <button
            id="close-notifications-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Sound Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/60">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  打卡成功提示音
                </div>
                <div className="text-xs text-zinc-400">
                  每次完成习惯或消除小计划时播放
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleSound}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                soundEnabled ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  soundEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Vibrate Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/60">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Vibrate className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  触感微震动
                </div>
                <div className="text-xs text-zinc-400">
                  支持设备点按打卡提供物理触觉反馈
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleVibrate}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                vibrateEnabled ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  vibrateEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Daily Evening Review Reminder */}
          <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    每日晚间打卡回顾
                  </div>
                  <div className="text-xs text-zinc-400">
                    定时发送今日计划完成度简报
                  </div>
                </div>
              </div>
              <input
                type="time"
                value={dailyReviewTime}
                onChange={handleTimeChange}
                className="px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200 outline-hidden"
              />
            </div>
          </div>

          {/* Test Notification Trigger */}
          <div className="p-3.5 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                测试系统通知栏动作
              </div>
              <div className="text-[11px] text-zinc-400">
                模拟 Android 顶部推送与一键打卡
              </div>
            </div>
            <button
              id="trigger-test-notification-settings-btn"
              onClick={() => {
                onTriggerTestNotification();
                onClose();
              }}
              className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Play className="w-3 h-3 text-emerald-500" />
              <span>立即测试</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            保存并关闭
          </button>
        </div>
      </div>
    </div>
  );
};
