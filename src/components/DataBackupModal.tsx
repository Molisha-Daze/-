import React, { useRef, useState } from 'react';
import { X, HardDriveDownload, Download, Upload, AlertTriangle, Check, RefreshCw } from 'lucide-react';
import { Habit, CheckIn, StandaloneCounter } from '../types';

interface DataBackupModalProps {
  habits: Habit[];
  checkIns: CheckIn[];
  counters: StandaloneCounter[];
  onRestoreData: (backupData: { habits?: Habit[]; checkIns?: CheckIn[]; counters?: StandaloneCounter[] }) => Promise<void>;
  onResetAllData: () => Promise<void>;
  onClose: () => void;
}

export const DataBackupModal: React.FC<DataBackupModalProps> = ({
  habits,
  checkIns,
  counters,
  onRestoreData,
  onResetAllData,
  onClose
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Export JSON backup file
  const handleExportJSON = () => {
    setIsExporting(true);
    try {
      const data = {
        app: 'DailyHabitTracker',
        version: '0.0.1',
        exportedAt: new Date().toISOString(),
        habits,
        checkIns,
        counters
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `habit_tracker_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setImportMessage('备份文件导出成功！');
    } catch {
      setImportMessage('导出备份文件失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  // Import JSON backup file
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportMessage(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || (typeof parsed !== 'object')) {
        throw new Error('无效的备份文件');
      }

      await onRestoreData({
        habits: parsed.habits,
        checkIns: parsed.checkIns,
        counters: parsed.counters
      });
      setImportMessage(`数据恢复成功！包含 ${parsed.habits?.length || 0} 项计划与 ${parsed.counters?.length || 0} 个计数器`);
    } catch (err: any) {
      setImportMessage(`导入失败: ${err.message || '文件格式错误'}`);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <HardDriveDownload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                数据备份与恢复
              </h3>
              <p className="text-[11px] text-zinc-400">
                导出全部打卡记录或从文件恢复
              </p>
            </div>
          </div>
          <button
            id="close-backup-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Data Overview Stats */}
          <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-zinc-800 dark:text-zinc-100">{habits.length}</div>
              <div className="text-[11px] text-zinc-400">计划项目</div>
            </div>
            <div className="border-x border-zinc-200 dark:border-zinc-700/60">
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{checkIns.length}</div>
              <div className="text-[11px] text-zinc-400">打卡记录</div>
            </div>
            <div>
              <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{counters.length}</div>
              <div className="text-[11px] text-zinc-400">独立计数器</div>
            </div>
          </div>

          {/* Export Action Card */}
          <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-2.5">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-500" />
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                导出备份文件 (JSON)
              </h4>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-normal">
              将目前的习惯计划、打卡历史及独立计数器数据打包保存至本地文件。
            </p>
            <button
              id="export-data-json-btn"
              onClick={handleExportJSON}
              disabled={isExporting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white text-xs font-semibold shadow-xs transition-all"
            >
              {isExporting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>立即导出备份文件</span>
            </button>
          </div>

          {/* Import Action Card */}
          <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-2.5">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-500" />
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                从备份文件恢复数据
              </h4>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-normal">
              选择之前导出的 JSON 备份文件，恢复计划与打卡进度。
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              id="import-data-json-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition-colors"
            >
              {isImporting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              <span>选择文件导入恢复</span>
            </button>
          </div>

          {/* Status Message */}
          {importMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{importMessage}</span>
            </div>
          )}

          {/* Dangerous Zone / Reset */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
            {!showResetConfirm ? (
              <button
                id="show-reset-confirm-btn"
                onClick={() => setShowResetConfirm(true)}
                className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1.5 py-1 transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>初始化/重置所有数据</span>
              </button>
            ) : (
              <div className="p-3 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>确定重置所有数据并恢复初始示例吗？</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    id="confirm-reset-all-btn"
                    onClick={async () => {
                      await onResetAllData();
                      setShowResetConfirm(false);
                      setImportMessage('已恢复出厂示例数据！');
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold transition-colors"
                  >
                    确认重置
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs transition-colors"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
          <button
            id="backup-modal-done-btn"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-semibold shadow-xs transition-colors"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
