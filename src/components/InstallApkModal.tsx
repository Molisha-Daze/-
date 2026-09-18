import React, { useState } from 'react';
import { X, Smartphone, Download, QrCode, CheckCircle2, Copy, Check, Sparkles, ExternalLink, HelpCircle } from 'lucide-react';
import { downloadAndroidProjectZip } from '../services/androidSources';

interface InstallApkModalProps {
  onClose: () => void;
}

export const InstallApkModal: React.FC<InstallApkModalProps> = ({ onClose }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const appUrl = window.location.href.split('?')[0];

  const handleDownloadZip = async () => {
    try {
      setIsDownloading(true);
      await downloadAndroidProjectZip();
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(appUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  手机安装与导出 APK
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  v0.0.1
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                支持手机一键免编译安装或导出 Android Studio 原生工程
              </p>
            </div>
          </div>
          <button
            id="close-install-apk-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Option 1: Mobile Direct Install (PWA) */}
          <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-500/20 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  手机直接一键安装（推荐·最快体验）
                </h4>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500 text-white font-semibold">
                免电脑免编译
              </span>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              本应用已完整配置 Android PWA 原生特性。用手机浏览器打开链接，点击菜单里的<strong>「添加到主屏幕」</strong>或<strong>「安装应用」</strong>，手机桌面将立即生成原生 App 图标，具备全屏独立运行、离线可用与触感反馈！
            </p>

            <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-emerald-500/20 flex items-center justify-between gap-2">
              <div className="truncate text-xs font-mono text-zinc-500 dark:text-zinc-400 select-all">
                {appUrl}
              </div>
              <button
                id="copy-mobile-link-btn"
                onClick={handleCopyLink}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? '已复制' : '复制手机链接'}</span>
              </button>
            </div>
          </div>

          {/* Option 2: Export Android Studio Project & Generate APK */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-500 text-white flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  导出 Android 原生工程生成 APK
                </h4>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold border border-blue-500/20">
                Kotlin + Compose
              </span>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              云端环境因沙箱安全机制未安装数十 GB 的 Android SDK 桌面交叉编译链。你可以一键下载完整的 Android 原生工程，在 Android Studio 中 10 秒即可构建出 <code>app-debug.apk</code> 安装包：
            </p>

            <ol className="text-xs text-zinc-500 dark:text-zinc-400 space-y-1.5 list-decimal pl-4">
              <li>点击下方按钮下载完整原生工程 ZIP 压缩包并解压；</li>
              <li>在 <strong>Android Studio</strong> 中点击 <code>Open</code> 打开该文件夹；</li>
              <li>点击顶部菜单 <code>Build</code> → <code>Build Bundle(s) / APK(s)</code> → <code>Build APK(s)</code>，或连接手机直接点击绿色运行按钮 ▶ 即可安装。</li>
            </ol>

            <button
              id="download-android-zip-from-modal-btn"
              onClick={handleDownloadZip}
              disabled={isDownloading}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isDownloading ? '正在打包中...' : '立即下载 Android 原生工程包 (v0.0.1 .zip)'}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
          <button
            id="install-apk-modal-done-btn"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-semibold shadow-xs transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
