
import React, { useState } from 'react';
import { CustomerMailAnalysis, MatchedUser, MailProcessingStatus } from '../types';

interface NotificationDisplayProps {
  analysis: CustomerMailAnalysis;
  ocrText: string;
  imageUrl?: string;
  onUpdateMatch?: (user: MatchedUser) => void;
  onDelete?: () => void;
  allCustomers?: MatchedUser[];
  onMarkAsNotified?: (status?: MailProcessingStatus) => void;
  onOpenDashboard?: (customer: MatchedUser) => void;
  isNotified?: boolean;
  currentStatus?: MailProcessingStatus;
  isArchived?: boolean;
}

const NotificationDisplay: React.FC<NotificationDisplayProps> = ({ 
  analysis, 
  imageUrl, 
  onUpdateMatch, 
  onDelete,
  allCustomers = [],
  onMarkAsNotified,
  onOpenDashboard,
  isNotified = false,
  currentStatus = 'pending',
  isArchived = false
}) => {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const [imgCopyStatus, setImgCopyStatus] = useState<'idle' | 'copied' | 'loading'>('idle');
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<MailProcessingStatus | null>(null);
  
  const matchedUser = analysis.matchedUser;
  const isMatched = matchedUser?.status === 'matched';

  // FIX: Added filteredUsers to support searching through customers for manual re-matching
  const filteredUsers = allCustomers.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    user.company.toLowerCase().includes(searchQuery.toLowerCase()) || 
    user.customerId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayId = isMatched ? matchedUser.customerId : '??';
  
  // 處理最終文案
  let finalReply = analysis.suggestedReply;
  if (isMatched) {
    const isVip = matchedUser.tags?.includes('VIP');
    const isMvp = matchedUser.tags?.includes('MVP');
    const isOffice = matchedUser.productCategory === '辦公室';
    const isBusinessReg = matchedUser.productCategory === '工商登記';
    const isMvpOrVip = isVip || isMvp;
    
    let salutation = `${matchedUser.name} 您好 👋`;
    if (isVip) salutation = `親愛的道騰尊榮 VIP ${matchedUser.name} 您好 👑`;
    else if (isMvp) salutation = `道騰傑出 MVP ${matchedUser.name} 您好 ✨`;

    const itemLabel = analysis.summary.includes('包裹') ? '包裹' : '郵件';
    const itemEmoji = itemLabel === '包裹' ? '📦' : '📩';

    let placementText = '';
    if (isOffice && itemLabel === '郵件') {
      placementText = `今日信件，幫您投遞到您的辦公室信箱內。`;
    } else {
      const floorStr = matchedUser.preferredFloor || '櫃檯';
      placementText = `我們已將您的${itemLabel}放置於您所在樓層的${floorStr}，方便您隨時親自前來領取。`;
    }

    const idLine = isBusinessReg ? `\n您的取信編號【#${matchedUser.customerId}】` : '';

    let servicesSection = '';
    if (isBusinessReg && isMvpOrVip) {
      const tierLabel = isVip ? '尊榮 VIP' : '傑出 MVP';
      servicesSection = `
💡 如您暫時不便親自前來，我們為${tierLabel}會員特別提供以下專屬${itemLabel}處理服務（請選擇適合您的選項，直接回覆本訊息告知，我們將優先為您處理）：
① 待您方便時親自前來櫃檯領取（目前項目置放於此）
② 協助移置至一樓信件自取區，方便您更彈性取件
③ 統一於月底為您轉寄至指定地址（運費另計，請提供完整收件資訊）
④ 先開封掃描內容並以電子檔方式傳送給您（確保隱私安全）
⑤ 若您判斷為非重要項目，可授權我們直接銷毀處理
我們將根據您的指示，盡快為您安排，確保服務高效且安心。`;
    } else if (isBusinessReg) {
      servicesSection = `
💡 如您暫時不便親自前來，我們也可提供以下協助服務（僅限緊急情況）：
協助轉寄${itemLabel}（運費另計，請提供完整收件地址及寄送方式，例如是否急件）
`;
    }

    finalReply = `${salutation}，
這裡有一件您的「${itemLabel}」已送達 ${itemEmoji}。
${placementText}${idLine}
道騰致力提供最專業的服務給您，如有任何需求，歡迎隨時聯繫我們。
${servicesSection}
祝您有個美好的一天！✨
✨ 道騰 DT Space 智能郵務管家 敬上`;
  }

  const handleCopyAndForward = async () => {
    try {
      await navigator.clipboard.writeText(finalReply);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
      onMarkAsNotified?.('notified');
      if (confirm('通知內容已複製！是否開啟 LINE？')) window.location.href = 'https://line.me/R/';
    } catch (err) { alert('複製失敗'); }
  };

  const handleAction = async (status: MailProcessingStatus) => {
    setActionLoading(status);
    await new Promise(resolve => setTimeout(resolve, 400));
    try {
      onMarkAsNotified?.(status);
    } catch (err) {
      alert("處置失敗");
    } finally {
      setActionLoading(null);
    }
  };

  const canProcess = (currentStatus === 'pending' || currentStatus === 'notified') && !isArchived;

  // 定義所有處置按鈕
  const allActions = [
    { id: 'scanned', label: '數位掃描', icon: '📧', color: 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100' },
    { id: 'move_to_1f', label: '1F 轉交', icon: '🚚', color: 'bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-100' },
    { id: 'at_counter_12', label: '12F 櫃台', icon: '🏢', color: 'bg-teal-50 text-teal-600 border-teal-100 hover:bg-teal-100' },
    { id: 'at_counter', label: '21F 櫃台', icon: '📍', color: 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100' },
    { id: 'at_counter_27', label: '27F 櫃台', icon: '🏢', color: 'bg-cyan-50 text-cyan-600 border-cyan-100 hover:bg-cyan-100' },
    { id: 'scheduled', label: '月底寄送', icon: '📦', color: 'bg-purple-50 text-purple-600 border-purple-100 hover:bg-purple-100' },
    { id: 'discarded', label: '碎紙銷毀', icon: '✂️', color: 'bg-gray-50 text-gray-600 border-gray-100 hover:bg-gray-100' },
  ];

  const displayedActions = allActions.filter(action => {
    if (!isMatched) return true;
    if (matchedUser.venue === '民權館') {
      return action.id !== 'at_counter_12';
    }
    if (matchedUser.venue === '四維館') {
      return action.id !== 'at_counter' && action.id !== 'at_counter_27';
    }
    return true;
  });

  return (
    <div className={`w-full bg-white rounded-[56px] overflow-hidden border border-gray-100 shadow-2xl mb-10 relative animate-in fade-in duration-700 ${isArchived ? 'opacity-80 scale-[0.98]' : ''}`}>
      
      <div className={`px-10 pt-10 pb-8 flex items-center justify-between transition-all duration-500 ${isArchived ? 'bg-slate-700 text-white' : isMatched ? 'bg-indigo-600 text-white' : 'bg-rose-500 text-white'}`}>
        <div className="flex items-center space-x-5">
          <div className="w-16 h-16 rounded-[22px] bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-2xl border border-white/20 shadow-inner">
            {displayId}
          </div>
          <div className="flex flex-col">
            <p className="font-black text-xl tracking-tight leading-none">
              {isMatched ? `${matchedUser.company} / ${matchedUser.name}` : '未知收件對象'}
            </p>
            <p className="text-[10px] font-black opacity-60 uppercase tracking-[0.2em] mt-2">
              {isArchived ? `任務已結案 (${currentStatus.toUpperCase()})` : `狀態指示：${currentStatus.toUpperCase()}`}
            </p>
          </div>
        </div>
        <div className="flex space-x-3">
          {!isArchived && <button onClick={() => setIsSearching(!isSearching)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/10 hover:bg-white/20 transition-all text-xl">🔍</button>}
          <button onClick={onDelete} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/10 hover:bg-white/20 transition-all text-2xl">✕</button>
        </div>
      </div>

      {isSearching && (
        <div className="p-6 bg-slate-50 border-b animate-in slide-in-from-top-6 duration-300">
          <input className="w-full p-5 bg-white border border-slate-100 rounded-[28px] text-sm font-black shadow-inner outline-none focus:ring-4 focus:ring-indigo-100" placeholder="搜尋取信編號、姓名或公司關鍵字..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          <div className="mt-4 max-h-56 overflow-y-auto space-y-2 custom-scrollbar pr-2">
            {filteredUsers.map(user => (
              <div key={user.lineUserId} onClick={() => { onUpdateMatch?.(user); setIsSearching(false); }} className="p-5 bg-white hover:bg-indigo-50 text-xs rounded-2xl cursor-pointer flex justify-between items-center border border-slate-100 hover:border-indigo-200 transition-all">
                <span className="font-black text-slate-700">#{user.customerId} - {user.company} / {user.name}</span>
                <span className="bg-indigo-600 text-white px-5 py-2 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-indigo-100">執行配對</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-10">
        <div className="flex flex-col md:flex-row gap-10 mb-12">
          {imageUrl && (
            <div className="w-full md:w-64 h-64 bg-slate-50 rounded-[48px] overflow-hidden shadow-2xl flex-shrink-0 border-[6px] border-white relative group cursor-zoom-in">
              <img src={imageUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700" alt="mail" />
            </div>
          )}
          <div className="flex-1">
            <div className="p-10 bg-slate-50/70 rounded-[48px] border border-slate-100 text-[14px] text-slate-600 leading-relaxed font-bold whitespace-pre-wrap shadow-inner relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500/30"></div>
              {finalReply}
            </div>
          </div>
        </div>
        
        {!isArchived && (
          <div className="flex flex-col space-y-4">
            <button 
              onClick={handleCopyAndForward} 
              className={`w-full py-7 rounded-[35px] font-black text-lg shadow-3xl transition-all flex items-center justify-center space-x-5 ${isNotified ? 'bg-slate-100 text-slate-400 border border-slate-200' : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:-translate-y-1'}`}
            >
              <span className="text-3xl">{copyStatus === 'copied' ? '✅' : '📲'}</span>
              <span className="tracking-wide">{copyStatus === 'copied' ? '內容已複製到剪貼簿' : '複製內容並開啟 LINE 通知'}</span>
            </button>
          </div>
        )}

        {canProcess && (
          <div className="pt-12 border-t border-slate-50 mt-12">
            <div className="flex flex-col items-center mb-10">
              <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">任務分流與處置中心 (V6)</h4>
              <div className="h-1 w-12 bg-indigo-100 rounded-full mt-2"></div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {displayedActions.map((action) => (
                <button 
                  key={action.id}
                  disabled={actionLoading !== null}
                  onClick={() => handleAction(action.id as MailProcessingStatus)}
                  className={`flex flex-col items-center justify-center p-6 rounded-[35px] border-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-40 ${action.color} ${actionLoading === action.id ? 'animate-pulse scale-95 border-indigo-500' : ''}`}
                >
                  <span className="text-3xl mb-3">{action.icon}</span>
                  <span className="text-[10px] font-black tracking-tighter uppercase whitespace-nowrap">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <button 
          onClick={() => isMatched && onOpenDashboard?.(matchedUser)}
          className="w-full mt-10 py-6 bg-white text-slate-300 rounded-[35px] text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 hover:text-indigo-600 transition-all border-2 border-dashed border-slate-100"
        >
          查看歷史處置儀表板 ➔
        </button>
      </div>
    </div>
  );
};

export default NotificationDisplay;
