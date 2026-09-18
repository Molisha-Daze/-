import React, { useState } from 'react';
import { ANDROID_FILES, downloadAndroidProjectZip } from '../services/androidSources';
import { Download, Copy, Check, X, FileCode2, Code } from 'lucide-react';

interface CodeViewerModalProps {
  onClose: () => void;
}

export const CodeViewerModal: React.FC<CodeViewerModalProps> = ({ onClose }) => {
  const [selectedFilePath, setSelectedFilePath] = useState(ANDROID_FILES[0].path);
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const currentFile = ANDROID_FILES.find((f) => f.path === selectedFilePath) || ANDROID_FILES[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      await downloadAndroidProjectZip();
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-5xl h-[88vh] bg-zinc-950 text-zinc-100 rounded-3xl border border-zinc-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                Android 原生工程源码 (Kotlin + Compose + Room)
              </h2>
              <p className="text-xs text-zinc-400">
                支持直接在 Android Studio 中打开并运行 (API 29 - 35)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="download-android-zip-btn"
              onClick={handleDownload}
              disabled={isDownloading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-xl text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {isDownloading ? '正在打包...' : '一键下载完整 Android 工程 (.zip)'}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body: Sidebar Files + Code View */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-72 border-r border-zinc-800 bg-zinc-900/40 overflow-y-auto p-3 space-y-1">
            <div className="px-2 py-1 text-[11px] font-bold tracking-wider uppercase text-zinc-400">
              工程源文件列表
            </div>
            {ANDROID_FILES.map((file) => {
              const isSelected = file.path === selectedFilePath;
              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedFilePath(file.path)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2.5 transition-colors ${
                    isSelected
                      ? 'bg-emerald-500/15 text-emerald-400 font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                  }`}
                >
                  <FileCode2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{file.name}</span>
                </button>
              );
            })}
          </div>

          {/* Code Viewer Panel */}
          <div className="flex-1 flex flex-col bg-zinc-950 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-2.5 bg-zinc-900/40 border-b border-zinc-800 text-xs">
              <div className="truncate text-zinc-300">
                <span className="font-mono text-emerald-400 mr-2">{currentFile.path}</span>
                <span className="text-zinc-400">({currentFile.description})</span>
              </div>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium transition-colors shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? '已复制' : '复制代码'}
              </button>
            </div>

            <div className="flex-1 p-4 overflow-auto font-mono text-xs text-zinc-300 leading-relaxed selection:bg-emerald-500/30">
              <pre className="whitespace-pre">
                <code>{currentFile.content}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
