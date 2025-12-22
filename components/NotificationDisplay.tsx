
import React, { useState } from 'react';
import { CustomerMailAnalysis, MatchedUser } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface NotificationDisplayProps {
  analysis: CustomerMailAnalysis;
  ocrText: string;
  imageUrl?: string;
  onUpdateMatch?: (user: MatchedUser) => void;
  onDelete?: () => void;
  onLinkUser?: (userId: string) => void;
  allCustomers?: MatchedUser[];
}

const NotificationDisplay: React.FC<NotificationDisplayProps> = ({ 
  analysis, 
  ocrText, 
  imageUrl, 
  onUpdateMatch, 
  onDelete,
  onLinkUser,
  allCustomers = []
}) => {
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const matchedUser = analysis.matchedUser;
  const isMatched = matchedUser?.status === 'matched';
  const isSpam = analysis.mailCategory === 'spam';
  const isLinked = matchedUser?.isLinked || false;

  const handlePushNotification = async () => {
    if (!isMatched || !isLinked) return;
    setIsSending(true);
    
    // @ts-ignore
    const liff = window.liff;
    const senderInfo = analysis.senderName ? `來自：${analysis.senderName}` : "寄件人：不詳";
    const messageText = `【AI 智能助理通知】\n親愛的 ${matchedUser?.name} (${matchedUser?.company})，我們已收到您的郵件。\n\n${senderInfo}\n分析要求：${analysis.requestedAction}\n處理狀態：正處理中\n\n感謝您的來信！`;

    try {
      if (liff && liff.isInClient()) {
        const messages: any[] = [{ type: 'text', text: messageText }];
        if (imageUrl) {
          messages.push({
            type: 'image',
            originalContentUrl: imageUrl,
            previewImageUrl: imageUrl
          });
        }
        await liff.sendMessages(messages);
      } else {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      
      setIsSent(true);
      setIsSending(false);
      setTimeout(() => setIsSent(false), 3000);
    } catch (err) {
      console.error("發送訊息失敗:", err);
      alert("發送訊息失敗。提示：LINE 需要公開的 HTTPS 圖片連結才能發送照片訊息。");
      setIsSending(false);
    }
  };

  const filteredUsers = allCustomers.filter(user => 
    user.name.includes(searchQuery) || (user.company && user.company.includes(searchQuery))
  );

  return (
    <div className="mt-4 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className={`rounded-3xl shadow-xl overflow-hidden border-2 transition-all ${isMatched ? (isLinked ? 'border-indigo-500 bg-white' : 'border-orange-300 bg-white') : (isSpam ? 'border-gray-300 bg-gray-50 opacity-90' : 'border-red-200 bg-white')}`}>
        
        {/* 狀態列 */}
        <div className={`${isSpam ? 'bg-gray-500' : (isMatched ? (isLinked ? 'bg-indigo-600' : 'bg-orange-500') : 'bg-red-500')} p-4 text-white flex items-center justify-between`}>
          <div className="flex items-center space-x-3">
            {isMatched ? (
              <img src={matchedUser.avatar} className="w-10 h-10 rounded-full border-2 border-white/50" alt="avatar" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">
                {isSpam ? '🗑️' : '❓'}
              </div>
            )}
            
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-black text-sm">{isMatched ? matchedUser.name : (isSpam ? '判定為垃圾信件' : '未識別客戶')}</h3>
                {isMatched && (
                  <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest ${isLinked ? 'bg-indigo-400' : 'bg-orange-400'}`}>
                    {isLinked ? '🔗 已連結' : '⚠️ 未連結'}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-white/70 truncate max-w-[150px]">
                {isMatched ? matchedUser.company : '需手動指派客戶以發送通知'}
              </div>
            </div>
          </div>
          
          <div className="flex space-x-1">
            <button onClick={() => setIsSearching(!isSearching)} className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors">🔍</button>
            <button onClick={onDelete} className="bg-white/20 hover:bg-red-500/50 p-2 rounded-lg transition-colors">✕</button>
          </div>
        </div>

        {isSearching && (
          <div className="p-3 bg-indigo-50 border-b border-indigo-100">
            <input 
              className="w-full p-2 bg-white border border-indigo-200 rounded-xl text-xs"
              placeholder="搜尋 CRM 客戶姓名..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
              {filteredUsers.map(user => (
                <div 
                  key={user.lineUserId}
                  onClick={() => { onUpdateMatch?.(user); setIsSearching(false); }}
                  className="p-2 bg-white hover:bg-indigo-600 hover:text-white text-[10px] flex justify-between cursor-pointer rounded-lg transition-all"
                >
                  <span className="font-bold">{user.name} ({user.company})</span>
                  <span className="font-black">選取</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-5 space-y-4">
          {imageUrl && (
            <div className="w-full relative group">
              <span className="absolute top-2 left-2 z-10 text-[8px] font-black bg-indigo-600/80 text-white px-1.5 py-0.5 rounded backdrop-blur-sm uppercase tracking-tighter">OCR 原始影像</span>
              <img 
                src={imageUrl} 
                className="w-full h-32 object-cover rounded-2xl border border-gray-100 shadow-inner group-hover:h-40 transition-all duration-300" 
                alt="Mail capture" 
              />
            </div>
          )}

          {/* 寄件人與收件人資訊區域 */}
          <div className="p-3 bg-indigo-50/20 rounded-2xl border border-indigo-50 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-black text-indigo-400 block uppercase">寄件人</span>
                <p className="font-bold text-gray-800 text-xs">{analysis.senderName || "無法識別"}</p>
                {analysis.senderAddress && <p className="text-[9px] text-gray-400 truncate max-w-[180px]">{analysis.senderAddress}</p>}
              </div>
              <div className="text-right">
                <span className="text-[9px] font-black text-gray-400 block uppercase">辨識收件人</span>
                <p className="font-bold text-gray-800 text-xs">{analysis.customerName || "未知"}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className="p-2.5 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center">
              <span className="text-[9px] font-black text-gray-400 block uppercase">處理動作</span>
              <p className={`font-black text-sm truncate ${analysis.isUrgent ? 'text-red-500' : 'text-indigo-600'}`}>{analysis.requestedAction}</p>
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
             <span className="text-[9px] font-black text-indigo-400 block mb-1 uppercase tracking-wider">AI 分析摘要</span>
             <p className="text-xs text-gray-600 leading-relaxed font-medium line-clamp-2">{analysis.summary}</p>
          </div>

          <div className="flex flex-col space-y-2 pt-2">
            {isMatched && !isLinked && (
              <button 
                onClick={() => onLinkUser?.(matchedUser.lineUserId)}
                className="w-full py-3 bg-orange-50 text-orange-600 border border-orange-200 rounded-2xl font-black text-xs hover:bg-orange-100 transition-all flex items-center justify-center space-x-2"
              >
                <span>🔗 確認身分並連結 LINE 帳號</span>
              </button>
            )}
            
            <button 
              onClick={handlePushNotification}
              disabled={!isMatched || !isLinked || isSending || isSent || isSpam}
              className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center transition-all shadow-lg active:scale-95
                ${isSent ? 'bg-green-500 text-white' : 
                  (isMatched && isLinked && !isSpam ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed')}`}
            >
              {isSending ? <LoadingSpinner /> : isSent ? '✅ 已成功傳送' : 
                (isSpam ? '⚠️ 垃圾郵件不提供通知' : 
                  (!isLinked ? '⚠️ 請先連結帳號以通知' : '📲 發送 LINE@ 即時通知'))}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationDisplay;
