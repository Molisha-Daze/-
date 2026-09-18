import React from 'react';
import { X, Check, Type } from 'lucide-react';

export type FontSizeOption = 'small' | 'normal' | 'large' | 'huge';

interface FontSizeModalProps {
  currentSize: FontSizeOption;
  onChangeSize: (size: FontSizeOption) => void;
  onClose: () => void;
}

interface SizeConfig {
  key: FontSizeOption;
  title: string;
  pixel: string;
  desc: string;
  previewTextSize: string;
}

const SIZES: SizeConfig[] = [
  {
    key: 'small',
    title: '小号字号',
    pixel: '14px (87.5%)',
    desc: '界面紧凑精炼，同屏容纳更多打卡与计划',
    previewTextSize: 'text-xs'
  },
  {
    key: 'normal',
    title: '标准字号 (默认)',
    pixel: '16px (100%)',
    desc: '推荐字号，阅读体验均衡细腻',
    previewTextSize: 'text-sm'
  },
  {
    key: 'large',
    title: '大号字号',
    pixel: '18px (112.5%)',
    desc: '文字醒目饱满，日常查阅清晰不费眼',
    previewTextSize: 'text-base'
  },
  {
    key: 'huge',
    title: '特大字号',
    pixel: '20px (125%)',
    desc: '超大视野呈现，字字分明无压力',
    previewTextSize: 'text-lg'
  }
];

export const FontSizeModal: React.FC<FontSizeModalProps> = ({
  currentSize,
  onChangeSize,
  onClose
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Type className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                设置字号
              </h3>
              <p className="text-[11px] text-zinc-400">
                即时缩放全软件字体与布局排版
              </p>
            </div>
          </div>
          <button
            id="close-font-size-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Live Preview Card */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
              <span>实时效果预览</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                当前: {SIZES.find((s) => s.key === currentSize)?.title}
              </span>
            </div>
            <p className="text-zinc-800 dark:text-zinc-200 font-semibold leading-relaxed">
              晨跑 3 公里 · 连续坚持第 12 天
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-normal">
              坚持微小的习惯，在时间的复利下终将汇聚为生活最深刻的蜕变。
            </p>
          </div>

          {/* Size Options Grid */}
          <div className="space-y-2">
            {SIZES.map((option) => {
              const isSelected = currentSize === option.key;
              return (
                <button
                  key={option.key}
                  id={`font-size-option-${option.key}`}
                  onClick={() => onChangeSize(option.key)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left ${
                    isSelected
                      ? 'bg-emerald-500/10 border-emerald-500/50 text-zinc-900 dark:text-zinc-100 ring-1 ring-emerald-500/30'
                      : 'bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 font-bold transition-colors ${
                        isSelected
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      <Type className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                          {option.title}
                        </span>
                        <span className="text-[11px] font-mono text-zinc-400">
                          {option.pixel}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {option.desc}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 ml-3">
                    {isSelected ? (
                      <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-zinc-300 dark:border-zinc-700" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
          <button
            id="font-size-done-btn"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            完成设置
          </button>
        </div>
      </div>
    </div>
  );
};
