import React from 'react';
import { X } from 'lucide-react';

interface PhotoViewerModalProps {
  photoUrl: string;
  onClose: () => void;
}

export const PhotoViewerModal: React.FC<PhotoViewerModalProps> = ({ photoUrl, onClose }) => {
  return (
    <div
      id="photo-viewer-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <button
        id="close-photo-viewer"
        onClick={onClose}
        className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      <div
        className="max-w-3xl max-h-[85vh] p-2 flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={photoUrl}
          alt="打卡完成留证大图"
          className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl border border-white/10"
        />
      </div>
    </div>
  );
};
