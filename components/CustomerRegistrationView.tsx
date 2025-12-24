
import React, { useState, useEffect } from 'react';

interface CustomerRegistrationViewProps {
  profile: { displayName: string, pictureUrl?: string, userId: string } | null;
  onRegister: (name: string, company: string) => void;
  isRegistered: boolean;
}

const CustomerRegistrationView: React.FC<CustomerRegistrationViewProps> = ({ profile, onRegister, isRegistered }) => {
  const [name, setName] = useState(profile?.displayName || '');
  const [company, setCompany] = useState('');
  const [countdown, setCountdown] = useState(5);

  // 當註冊成功時，啟動自動關閉倒數
  useEffect(() => {
    if (isRegistered) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            // @ts-ignore
            if (window.liff?.closeWindow) window.liff.closeWindow();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isRegistered]);

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-indigo-600 p-8 text-white">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white/20 border-b-white mb-6"></div>
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
          </div>
        </div>
        <p className="font-black tracking-widest text-sm animate-pulse uppercase">Securing LINE Connection...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
      <div className="bg-white rounded-[50px] shadow-2xl p-10 w-full max-w-md text-center border border-gray-100 animate-in fade-in zoom-in duration-700 relative overflow-hidden">
        
        {/* 頂部裝飾 */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

        <div className="relative mb-8">
          <div className="absolute -inset-1 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-full blur opacity-25 animate-pulse"></div>
          <img 
            src={profile.pictureUrl} 
            className="relative w-28 h-28 rounded-full mx-auto border-4 border-white shadow-xl object-cover" 
            alt="profile" 
          />
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] px-4 py-1.5 rounded-full font-black shadow-lg border-2 border-white whitespace-nowrap">
            已通過 LINE 認證
          </div>
        </div>

        {isRegistered ? (
          <div className="py-2 animate-in slide-in-from-bottom-4 duration-500">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-green-50">
              <span className="text-4xl">✨</span>
            </div>
            
            <h1 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">服務已啟用！</h1>
            <p className="text-gray-500 text-sm mb-10 leading-relaxed font-medium">
              您的帳號已成功與 <span className="text-indigo-600 font-bold">AI 智能助理</span> 綁定。<br/>
              現在您可以回到 LINE 聊天室，<br/>
              當我們收到您的信件時，會第一時間通知您。
            </p>

            <div className="space-y-4">
              <button 
                onClick={() => {
                  // @ts-ignore
                  if (window.liff?.closeWindow) window.liff.closeWindow();
                }}
                className="w-full py-5 bg-gray-900 text-white rounded-[24px] font-black text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center space-x-2"
              >
                <span>立即關閉視窗</span>
                <span className="bg-white/20 px-2 py-0.5 rounded text-[10px]">{countdown}s</span>
              </button>
              
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] animate-pulse">
                視窗將於 {countdown} 秒後自動關閉
              </p>
            </div>

            <div className="mt-10 flex justify-center space-x-1">
               {[...Array(5)].map((_, i) => (
                 <div key={i} className={`h-1 rounded-full transition-all duration-1000 ${i < (5 - countdown) ? 'w-8 bg-indigo-500' : 'w-2 bg-gray-100'}`}></div>
               ))}
            </div>
          </div>
        ) : (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-2xl font-black text-gray-800 mb-2">信件接收通知</h1>
            <p className="text-gray-400 text-sm mb-10 leading-relaxed font-medium">
              哈囉 {profile.displayName}！<br/>請確認您的資料以開啟 AI 自動化通知服務。
            </p>
            
            <div className="space-y-5 text-left">
              <div className="group">
                <label className="text-[10px] font-black text-indigo-500 uppercase ml-4 mb-2 block tracking-widest group-focus-within:text-indigo-600 transition-colors">您的識別姓名</label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-lg">👤</span>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例如：王小明"
                    className="w-full pl-14 pr-6 py-5 bg-gray-50 border-2 border-transparent rounded-[24px] text-sm font-bold focus:bg-white focus:border-indigo-500 outline-none transition-all shadow-inner group-hover:bg-gray-100"
                  />
                </div>
              </div>
              
              <div className="group">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-4 mb-2 block tracking-widest group-focus-within:text-indigo-600 transition-colors">所屬公司 (選填)</label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-lg">🏢</span>
                  <input 
                    type="text" 
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="例如：創意設計公司"
                    className="w-full pl-14 pr-6 py-5 bg-gray-50 border-2 border-transparent rounded-[24px] text-sm font-bold focus:bg-white focus:border-indigo-500 outline-none transition-all shadow-inner group-hover:bg-gray-100"
                  />
                </div>
              </div>
              
              <div className="pt-4">
                <button 
                  onClick={() => onRegister(name, company)}
                  className="w-full py-6 bg-indigo-600 text-white rounded-[28px] font-black text-lg shadow-2xl shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center space-x-3"
                >
                  <span>🚀 開啟通知服務</span>
                </button>
                <p className="text-center mt-6 text-[10px] text-gray-300 font-bold uppercase tracking-widest">
                  點擊即表示同意接收 AI 分析通知訊息
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-10 flex items-center space-x-3 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all cursor-default">
         <div className="h-px w-8 bg-gray-300"></div>
         <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em]">AI Mail Assistant V5</p>
         <div className="h-px w-8 bg-gray-300"></div>
      </div>
    </div>
  );
};

export default CustomerRegistrationView;
