
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
      // 重置 input 以便可以再次選擇相同檔案
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full flex flex-col items-center mb-6">
      <h2 className="text-xl sm:text-2xl font-black text-gray-800 mb-6 tracking-tight">📸 批次上傳或拍攝郵件</h2>
      
      <div 
        onClick={triggerFileInput}
        className="w-full max-w-sm p-12 border-4 border-dashed border-indigo-100 rounded-[48px] flex flex-col items-center justify-center bg-indigo-50/30 hover:bg-indigo-50/50 cursor-pointer transition-all group shadow-inner"
      >
        <div className="w-20 h-20 bg-white rounded-[32px] shadow-lg flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all">
          <svg
            className="h-10 w-10 text-indigo-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M12 4v16m8-8H4"
            ></path>
          </svg>
        </div>
        <p className="text-indigo-600 font-black text-lg tracking-tight">點擊選擇多張郵件照片</p>
        <p className="text-indigo-400 text-[10px] font-black mt-2 uppercase tracking-widest opacity-60">支援批量處理分析</p>
      </div>

      <input
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
        ref={fileInputRef}
      />
      
      <div className="mt-8 flex items-center space-x-3">
        <button
          onClick={() => {
            if (fileInputRef.current) {
              fileInputRef.current.capture = "camera";
              fileInputRef.current.click();
            }
          }}
          className="flex items-center px-8 py-4 bg-white text-gray-600 rounded-[24px] text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all border border-gray-100 shadow-sm active:scale-95"
        >
          <span className="mr-3 text-lg">📷</span> 開啟相機
        </button>
        
        <button
          onClick={onOpenManualNotification}
          className="flex items-center px-8 py-4 bg-indigo-600 text-white rounded-[24px] text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95"
        >
          <span className="mr-3 text-lg">🔔</span> 通知功能
        </button>
      </div>
    </div>
  );
};

export default ImageUploader;
