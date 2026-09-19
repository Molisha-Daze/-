import React from 'react';
import { X, Sparkles, CheckCircle2, ShieldCheck, Heart, Smartphone } from 'lucide-react';

interface AboutModalProps {
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              关于软件
            </h3>
          </div>
          <button
            id="close-about-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 text-center space-y-6 overflow-y-auto">
          {/* Logo & Version */}
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 mb-3">
              <CheckCircle2 className="w-9 h-9 stroke-[2.2]" />
            </div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              每日习惯打卡
            </h2>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mt-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-mono font-medium">
              <span>版本号</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">v0.0.1</span>
            </div>
          </div>

          {/* Core Slogan & Calligraphy Cursive English Translation */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-zinc-50 to-emerald-50/40 dark:from-zinc-800/60 dark:to-emerald-950/20 border border-emerald-500/20 shadow-xs relative overflow-hidden">
            <div className="text-base sm:text-lg font-bold text-zinc-800 dark:text-zinc-100 tracking-wide mb-1.5">
              “看到更好的自己”
            </div>

            {/* Cursive Calligraphy English Translation */}
            <div
              className="text-xl sm:text-2xl text-emerald-600 dark:text-emerald-400 font-normal select-none"
              style={{
                fontFamily: "'Dancing Script', 'Caveat', 'Brush Script MT', cursive, Georgia, serif",
                letterSpacing: '0.04em',
                lineHeight: 1.4
              }}
            >
              To see a better version of yourself
            </div>
          </div>

          {/* Features Highlights */}
          <div className="grid grid-cols-2 gap-2 text-left">
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <div>
                <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">纯本地优先</div>
                <div className="text-[10px] text-zinc-400">数据离线安全存储</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-800 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-purple-500 shrink-0" />
              <div>
                <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Android 原生</div>
                <div className="text-[10px] text-zinc-400">Kotlin + Compose 架构</div>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="text-[11px] text-zinc-400 flex items-center justify-center gap-1">
            <span>用心陪伴每一个微小的日常蜕变</span>
            <Heart className="w-3 h-3 fill-rose-500 text-rose-500 inline" />
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-zinc-100 dark:border-zinc-800 flex justify-center">
          <button
            id="about-modal-close-btn"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-semibold shadow-xs transition-colors"
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  );
};
