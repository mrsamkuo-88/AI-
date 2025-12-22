
import React, { useRef } from 'react';

interface ImageUploaderProps {
  onImagesSelect: (files: File[]) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImagesSelect }) => {
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
      <h2 className="text-xl sm:text-2xl font-bold text-gray-700 mb-4">📸 批次上傳或拍攝郵件</h2>
      
      <div 
        onClick={triggerFileInput}
        className="w-full max-w-sm p-8 border-4 border-dashed border-indigo-100 rounded-3xl flex flex-col items-center justify-center bg-indigo-50/30 hover:bg-indigo-50/50 cursor-pointer transition-all group"
      >
        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
          <svg
            className="h-8 w-8 text-indigo-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 4v16m8-8H4"
            ></path>
          </svg>
        </div>
        <p className="text-indigo-600 font-bold">點擊選擇多張郵件照片</p>
        <p className="text-indigo-400 text-xs mt-1">支援批量處理分析</p>
      </div>

      <input
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
        ref={fileInputRef}
      />
      
      <div className="mt-4 flex space-x-2">
        <button
          onClick={() => {
            if (fileInputRef.current) {
              fileInputRef.current.capture = "camera";
              fileInputRef.current.click();
            }
          }}
          className="flex items-center px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          <span className="mr-2">📷</span> 開啟相機
        </button>
      </div>
    </div>
  );
};

export default ImageUploader;
