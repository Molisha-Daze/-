import React, { useState } from 'react';
import { StandaloneCounter } from '../types';
import { X, Hash, Sparkles } from 'lucide-react';

interface AddEditCounterModalProps {
  initialCounter?: StandaloneCounter | null;
  onClose: () => void;
  onSave: (data: {
    name: string;
    currentCount: number;
    hasLimit: boolean;
    limitCount?: number | null;
    unit: string;
    step: number;
    colorHex: string;
    note?: string;
  }) => void;
}

const PRESET_COLORS = [
  { hex: '#EF4444', name: '活力红' },
  { hex: '#F59E0B', name: '琥珀橙' },
  { hex: '#10B981', name: '翡翠绿' },
  { hex: '#0EA5E9', name: '天蓝色' },
  { hex: '#8B5CF6', name: '幻紫色' },
  { hex: '#EC4899', name: '玫瑰粉' }
];

export const AddEditCounterModal: React.FC<AddEditCounterModalProps> = ({
  initialCounter,
  onClose,
  onSave
}) => {
  const [name, setName] = useState(initialCounter?.name || '');
  const [currentCount, setCurrentCount] = useState<number>(
    initialCounter?.currentCount != null ? initialCounter.currentCount : 0
  );
  const [hasLimit, setHasLimit] = useState<boolean>(initialCounter?.hasLimit || false);
  const [limitCount, setLimitCount] = useState<number>(
    initialCounter?.limitCount != null ? initialCounter.limitCount : 10
  );
  const [unit, setUnit] = useState(initialCounter?.unit || '次');
  const [step, setStep] = useState<number>(initialCounter?.step || 1);
  const [colorHex, setColorHex] = useState(initialCounter?.colorHex || '#EF4444');
  const [note, setNote] = useState(initialCounter?.note || '');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('请输入计数器名称');
      return;
    }

    onSave({
      name: name.trim(),
      currentCount: Math.max(0, currentCount),
      hasLimit,
      limitCount: hasLimit ? Math.max(1, limitCount) : null,
      unit: unit.trim() || '次',
      step: Math.max(1, step),
      colorHex,
      note: note.trim() ? note.trim() : undefined
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="add-edit-counter-dialog"
        className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
          <div className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-emerald-500" />
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              {initialCounter ? '编辑独立计数器' : '新建独立计数器'}
            </h2>
          </div>
          <button
            id="close-counter-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto max-h-[80vh]">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              计数器名称 <span className="text-red-500">*</span>
            </label>
            <input
              id="counter-name-input"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder="例如：冰箱里的可乐、今日咖啡、跳绳计数"
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              maxLength={30}
              autoFocus
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>

          {/* Current count & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                当前数值
              </label>
              <input
                id="counter-current-count-input"
                type="number"
                min={0}
                value={currentCount}
                onChange={(e) => setCurrentCount(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                计数单位
              </label>
              <input
                id="counter-unit-input"
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="罐、杯、次、个"
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
                maxLength={6}
              />
            </div>
          </div>

          {/* Upper Limit Settings (上限设置) */}
          <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                  设置上限 / 容量
                </span>
                <span className="text-[11px] text-zinc-400">
                  {hasLimit ? '已设置上限，将显示剩余量与进度条' : '不设置上限，支持无限制自由点击累计'}
                </span>
              </div>
              <input
                id="counter-has-limit-toggle"
                type="checkbox"
                checked={hasLimit}
                onChange={(e) => setHasLimit(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500 cursor-pointer"
              />
            </div>

            {hasLimit && (
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700 flex items-center gap-3">
                <label className="text-xs text-zinc-600 dark:text-zinc-300 shrink-0 font-medium">
                  上限数值：
                </label>
                <div className="flex items-center gap-1.5 flex-1">
                  <input
                    id="counter-limit-count-input"
                    type="number"
                    min={1}
                    value={limitCount}
                    onChange={(e) => setLimitCount(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
                  />
                  <span className="text-xs text-zinc-500 shrink-0">{unit || '个'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Step & Note */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                点击步长
              </label>
              <input
                id="counter-step-input"
                type="number"
                min={1}
                max={100}
                value={step}
                onChange={(e) => setStep(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                备注说明 (可选)
              </label>
              <input
                id="counter-note-input"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="例如：喝一次点一下，记录剩余存量"
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs"
              />
            </div>
          </div>

          {/* Theme Color */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              主题色
            </label>
            <div className="flex items-center gap-3">
              {PRESET_COLORS.map((c) => {
                const isSelected = colorHex === c.hex;
                return (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setColorHex(c.hex)}
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

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              取消
            </button>
            <button
              id="save-counter-submit-btn"
              type="submit"
              className="px-5 py-2 text-xs font-semibold rounded-xl text-white shadow-sm transition-all hover:opacity-95 active:scale-95"
              style={{ backgroundColor: colorHex }}
            >
              保存计数器
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
