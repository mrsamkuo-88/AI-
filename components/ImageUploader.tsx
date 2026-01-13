import React, { useRef } from 'react';

interface ImageUploaderProps {
  onImagesSelect: (files: File[]) => void;
  onOpenManualNotification: () => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImagesSelect, onOpenManualNotification }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      onImagesSelect(Array.from(event.target.files));
      event.target.value = ''; // 重置以支援相同檔案重複選取
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* 批次上傳區 */}
      <div 
        onClick={() => fileInputRef.current?.click()}
        className="w-full p-10 border-4 border-dashed border-indigo-100 rounded-[45px] bg-white flex flex-col items-center justify-center cursor-pointer hover:border-indigo-300 transition-all shadow-sm active:scale-[0.98]"
      >
        <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-3xl mb-4">📂</div>
        <h2 className="text-lg font-black text-gray-800">批次載入郵件照片</h2>
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">支援多選上傳</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* 直接拍照區 */}
        <button
          onClick={() => cameraInputRef.current?.click()}
          className="flex flex-col items-center justify-center py-8 bg-indigo-600 text-white rounded-[35px] shadow-lg shadow-indigo-100 active:scale-95 transition-all"
        >
          <span className="text-3xl mb-2">📸</span>
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">直接拍照分析</span>
        </button>

        {/* 手動通知區 */}
        <button
          onClick={onOpenManualNotification}
          className="flex flex-col items-center justify-center py-8 bg-white border border-gray-100 text-indigo-600 rounded-[35px] shadow-sm active:scale-95 transition-all"
        >
          <span className="text-3xl mb-2">🔔</span>
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">手動通知</span>
        </button>
      </div>

      <input type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" ref={fileInputRef} />
      {/* // Fix: Changed capture="camera" to capture="environment" to resolve type error and use back camera */}
      <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" ref={cameraInputRef} />
      
      <p className="text-center text-[9px] text-gray-400 font-medium leading-relaxed">
        手機拍照時請對準信封並保持穩定<br/>系統會自動壓縮圖片以確保辨識速度
      </p>
    </div>
  );
};

export default ImageUploader;