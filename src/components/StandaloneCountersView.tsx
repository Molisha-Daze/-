import React, { useRef } from 'react';
import { StandaloneCounter } from '../types';
import {
  Hash,
  Plus,
  Minus,
  RotateCcw,
  Edit2,
  Trash2
} from 'lucide-react';

interface StandaloneCountersViewProps {
  counters: StandaloneCounter[];
  onAddCounter: () => void;
  onEditCounter: (counter: StandaloneCounter) => void;
  onDeleteCounter: (id: number) => void;
  onStepCounter: (id: number, delta: number) => void;
  onResetCounter: (id: number, skipConfirmation?: boolean) => void;
}

export const StandaloneCountersView: React.FC<StandaloneCountersViewProps> = ({
  counters,
  onAddCounter,
  onEditCounter,
  onDeleteCounter,
  onStepCounter,
  onResetCounter
}) => {
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPressRef = useRef(false);

  const beginResetPress = (id: number) => {
    didLongPressRef.current = false;
    resetTimerRef.current = setTimeout(() => {
      didLongPressRef.current = true;
      onResetCounter(id, true);
    }, 650);
  };

  const cancelResetPress = () => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner / Introduction */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <Hash className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                独立计数器
              </h2>
            </div>
          </div>

          <button
            id="add-counter-btn"
            onClick={onAddCounter}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>新建计数器</span>
          </button>
        </div>
      </div>

      {/* Counters Grid */}
      {counters.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto mb-3">
            <Hash className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
            暂无独立计数器
          </h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
            点击上方按钮，创建你的第一个随心计数器，如记录“冰箱里的可乐”
          </p>
          <button
            onClick={onAddCounter}
            className="mt-4 px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-semibold shadow-xs"
          >
            立即创建
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {counters.map((counter) => {
            const hasLimit = counter.hasLimit && counter.limitCount != null && counter.limitCount > 0;
            const progressRatio = hasLimit
              ? Math.min(1, counter.currentCount / counter.limitCount!)
              : 0;
            const remaining = hasLimit ? Math.max(0, counter.limitCount! - counter.currentCount) : 0;

            return (
              <div
                key={counter.id}
                id={`standalone-counter-card-${counter.id}`}
                className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5 shadow-xs flex flex-col justify-between relative overflow-hidden transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
              >
                {/* Header: Title, Note & Actions */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: counter.colorHex }}
                        />
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {counter.name}
                        </h3>
                      </div>
                      {counter.note && (
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">
                          {counter.note}
                        </p>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onPointerDown={() => beginResetPress(counter.id)}
                        onPointerUp={cancelResetPress}
                        onPointerLeave={cancelResetPress}
                        onPointerCancel={cancelResetPress}
                        onClick={() => {
                          if (!didLongPressRef.current) onResetCounter(counter.id);
                          didLongPressRef.current = false;
                        }}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        title="点击确认清零，或长按 0.65 秒清零"
                        aria-label={`将${counter.name}清零`}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        id={`edit-counter-btn-${counter.id}`}
                        onClick={() => onEditCounter(counter)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                        title="编辑"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        id={`delete-counter-btn-${counter.id}`}
                        onClick={() => onDeleteCounter(counter.id)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Status / Limit Badge */}
                  <div className="mt-3 flex items-center justify-between text-xs">
                    {hasLimit ? (
                      <div className="flex items-center justify-between w-full text-zinc-500 dark:text-zinc-400 text-[11px]">
                        <span>
                          上限: <strong className="text-zinc-800 dark:text-zinc-200">{counter.limitCount}</strong> {counter.unit}
                        </span>
                        <span>
                          {counter.currentCount >= counter.limitCount! ? (
                            <span className="text-amber-500 font-bold">已达上限</span>
                          ) : (
                            <span>剩余: {remaining} {counter.unit}</span>
                          )}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-medium">
                        无上限自由计数
                      </span>
                    )}
                  </div>

                  {/* Progress indicator if has limit */}
                  {hasLimit && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${progressRatio * 100}%`,
                            backgroundColor: counter.colorHex
                          }}
                        />
                      </div>
                      <span className="text-[10px] tabular-nums font-semibold text-zinc-400 shrink-0">
                        {Math.round(progressRatio * 100)}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Big Counter Value and Tap Controls */}
                <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  {/* Left: Value display */}
                  <div className="flex items-baseline gap-1">
                    <span
                      className="text-3xl font-black tracking-tight"
                      style={{ color: counter.colorHex }}
                    >
                      {counter.currentCount}
                    </span>
                    <span className="text-xs font-semibold text-zinc-400">
                      {counter.unit}
                    </span>
                  </div>

                  {/* Right: Step Buttons (+/-) */}
                  <div className="flex items-center gap-2">
                    <button
                      id={`counter-minus-btn-${counter.id}`}
                      onClick={() => onStepCounter(counter.id, -counter.step)}
                      disabled={counter.currentCount <= 0}
                      className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-95 disabled:opacity-30 disabled:pointer-events-none text-zinc-700 dark:text-zinc-200 flex items-center justify-center font-bold transition-all shadow-xs"
                      title={`减 ${counter.step}`}
                    >
                      <Minus className="w-4 h-4 stroke-[2.5]" />
                    </button>

                    <button
                      id={`counter-plus-btn-${counter.id}`}
                      onClick={() => onStepCounter(counter.id, counter.step)}
                      className="px-4 h-10 rounded-2xl text-white flex items-center gap-1 font-bold text-sm shadow-md active:scale-95 transition-all"
                      style={{ backgroundColor: counter.colorHex }}
                      title={`加 ${counter.step} (点一下)`}
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>+{counter.step}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
