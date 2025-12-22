
import React, { useState } from 'react';
import { CustomerMailAnalysis, MatchedUser } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { MOCK_CUSTOMER_DB } from '../constants';

interface NotificationDisplayProps {
  analysis: CustomerMailAnalysis;
  ocrText: string;
  onUpdateMatch?: (user: MatchedUser) => void;
  onDelete?: () => void;
}

const NotificationDisplay: React.FC<NotificationDisplayProps> = ({ analysis, ocrText, onUpdateMatch, onDelete }) => {
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const matchedUser = analysis.matchedUser;
  const isMatched = matchedUser?.status === 'matched';
  const isSpam = analysis.mailCategory === 'spam';

  const handlePushNotification = async () => {
    if (!isMatched) return;
    setIsSending(true);
    
    // @ts-ignore
    const liff = window.liff;
    const messageText = `【AI 智能助理通知】\n親愛的 ${matchedUser?.name} (${matchedUser?.company})，我們已收到您的郵件。\n\n分析要求：${analysis.requestedAction}\n處理狀態：正處理中\n\n感謝您的來信！`;

    try {
      // 如果 LIFF 在聊天視窗內開啟 (Chat Window context)
      if (liff && liff.isInClient() && (liff.getContext()?.type === 'utou' || liff.getContext()?.type === 'room' || liff.getContext()?.type === 'group')) {
        await liff.sendMessages([{
          type: 'text',
          text: messageText
        }]);
        console.log("✅ [LIFF] 訊息已直接發送至聊天視窗");
      } else {
        // 模擬後端 Push API 呼叫 (這通常需要後端搭配 Messaging API Access Token)
        console.log("🚀 [模擬後端 Push API 呼叫]", { to: matchedUser?.lineUserId, text: messageText });
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      
      setIsSent(true);
      setIsSending(false);
      setTimeout(() => setIsSent(false), 3000);
    } catch (err) {
      console.error("發送訊息失敗:", err);
      alert("發送訊息失敗，請確認 LIFF 權限設定。");
      setIsSending(false);
    }
  };

  const filteredUsers = MOCK_CUSTOMER_DB.filter(user => 
    user.name.includes(searchQuery) || user.company.includes(searchQuery)
  );

  return (
    <div className="mt-4 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className={`rounded-3xl shadow-xl overflow-hidden border-2 transition-all ${isMatched ? 'border-indigo-500 bg-white' : (isSpam ? 'border-gray-300 bg-gray-50 opacity-90' : 'border-orange-200 bg-white')}`}>
        
        {/* 狀態列 */}
        <div className={`${isSpam ? 'bg-gray-500' : (isMatched ? 'bg-indigo-600' : 'bg-orange-500')} p-4 text-white flex items-center justify-between`}>
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
                <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest ${isSpam ? 'bg-gray-700' : 'bg-white/20'}`}>
                  {analysis.mailCategory === 'spam' ? 'SPAM' : 'NORMAL'}
                </span>
              </div>
              <div className="text-[10px] text-white/70 truncate max-w-[150px]">
                {isMatched ? matchedUser.company : '手動指派客戶'}
              </div>
            </div>
          </div>
          
          <div className="flex space-x-1">
            <button onClick={() => setIsSearching(!isSearching)} className="bg-black/20 hover:bg-black/30 p-2 rounded-lg transition-colors">🔍</button>
            <button onClick={onDelete} className="bg-black/20 hover:bg-red-500/50 p-2 rounded-lg transition-colors">🗑️</button>
          </div>
        </div>

        {isSearching && (
          <div className="p-3 bg-indigo-50 border-b border-indigo-100">
            <input 
              className="w-full p-2 bg-white border border-indigo-200 rounded-xl text-xs"
              placeholder="搜尋客戶姓名或公司..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
              {filteredUsers.map(user => (
                <div 
                  key={user.lineUserId}
                  onClick={() => { onUpdateMatch?.({...user, status: 'matched', confidence: 1.0}); setIsSearching(false); }}
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
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2.5 bg-gray-50 rounded-2xl border border-gray-100">
              <span className="text-[9px] font-black text-gray-400 block mb-0.5 uppercase">識別寄件者</span>
              <p className="font-bold text-gray-800 text-sm truncate">{analysis.customerName}</p>
            </div>
            <div className="p-2.5 bg-gray-50 rounded-2xl border border-gray-100">
              <span className="text-[9px] font-black text-gray-400 block mb-0.5 uppercase">要求動作</span>
              <p className={`font-black text-sm truncate ${analysis.isUrgent ? 'text-red-500' : 'text-indigo-600'}`}>{analysis.requestedAction}</p>
            </div>
          </div>

          <div className="p-3 bg-indigo-50/30 rounded-2xl border border-indigo-50">
             <span className="text-[9px] font-black text-indigo-400 block mb-1 uppercase tracking-wider">AI 分析摘要</span>
             <p className="text-xs text-gray-600 leading-relaxed font-medium">{analysis.summary}</p>
          </div>

          <div className="flex flex-col space-y-2 pt-2">
            <button 
              onClick={handlePushNotification}
              disabled={!isMatched || isSending || isSent || isSpam}
              className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center transition-all shadow-lg active:scale-95
                ${isSent ? 'bg-green-500 text-white' : 
                  (isMatched && !isSpam ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed')}`}
            >
              {isSending ? <LoadingSpinner /> : isSent ? '✅ 已傳送 LINE 通知' : (isSpam ? '⚠️ 垃圾信件不可通知' : '📲 傳給客戶 (LINE 通知)')}
            </button>
            {isSpam && <button onClick={onDelete} className="w-full py-3 bg-gray-100 text-gray-400 rounded-2xl font-black text-xs">🗑️ 刪除垃圾信件結果</button>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationDisplay;
