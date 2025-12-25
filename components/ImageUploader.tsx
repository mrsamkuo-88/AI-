
import React, { useRef } from 'react';

interface ImageUploaderProps {
  onImagesSelect: (files: File[]) => void;
  onOpenManualNotification: () => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImagesSelect, onOpenManualNotification }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      onImagesSelect(Array.from(event.target.files));
      // 清除內容以便連續選取相同檔案
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* 核心批次上傳區 */}
      <div 
        onClick={triggerFileInput}
        className="w-full mb-6 group cursor-pointer"
      >
        <div className="w-full p-12 border-4 border-dashed border-indigo-100 rounded-[56px] flex flex-col items-center justify-center bg-white hover:bg-indigo-50/50 hover:border-indigo-300 transition-all shadow-xl shadow-indigo-100/20 active:scale-[0.98]">
          <div className="w-24 h-24 bg-indigo-600 rounded-[35px] shadow-lg flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all">
            <svg className="h-12 w-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">批次載入郵件照片</h2>
          <p className="text-gray-400 text-sm font-bold mt-2 uppercase tracking-widest text-center">
            支援 <span className="text-indigo-600 underline">多選上傳</span> (相簿、OneDrive、iCloud)
          </p>
          <div className="mt-6 px-6 py-2 bg-indigo-50 rounded-full text-[10px] font-black text-indigo-500 uppercase tracking-widest">
            點擊此區域開始選取
          </div>
        </div>
      </div>

      <input
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
        ref={fileInputRef}
      />
      
      {/* 快速工具列 */}
      <div className="w-full grid grid-cols-2 gap-4 px-2">
        <button
          onClick={() => {
            if (fileInputRef.current) {
              fileInputRef.current.capture = "camera";
              fileInputRef.current.click();
            }
          }}
          className="flex flex-col items-center justify-center py-6 bg-white text-gray-700 rounded-[32px] hover:bg-gray-50 transition-all border border-gray-100 shadow-md active:scale-95"
        >
          <span className="text-3xl mb-1">📷</span>
          <span className="text-[10px] font-black uppercase tracking-widest">直接拍照</span>
        </button>
        
        <button
          onClick={onOpenManualNotification}
          className="flex flex-col items-center justify-center py-6 bg-white text-indigo-600 rounded-[32px] hover:bg-indigo-50 transition-all border border-indigo-100 shadow-md active:scale-95"
        >
          <span className="text-3xl mb-1">🔔</span>
          <span className="text-[10px] font-black uppercase tracking-widest">手動通知</span>
        </button>
      </div>
    </div>
  );
};

export default ImageUploader;
