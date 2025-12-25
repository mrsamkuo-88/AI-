
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

  // 確保顯示正確的取信編號，若匹配則使用資料庫編號
  const displayId = isMatched ? matchedUser.customerId : '??';
  
  // 處理最終文案
  let finalReply = analysis.suggestedReply;
  if (isMatched) {
    const isVip = matchedUser.tags?.includes('VIP');
    const isMvp = matchedUser.tags?.includes('MVP');
    const isOffice = matchedUser.productCategory === '辦公室';
    const isBusinessReg = matchedUser.productCategory === '工商登記';
    const isMvpOrVip = isVip || isMvp;
    
    // Determine Salutation
    let salutation = `${matchedUser.name} 您好 👋`;
    if (isVip) salutation = `親愛的道騰尊榮 VIP ${matchedUser.name} 您好 👑`;
    else if (isMvp) salutation = `道騰傑出 MVP ${matchedUser.name} 您好 ✨`;

    // Item Type Detection from analysis summary or provided type
    const itemLabel = analysis.summary.includes('包裹') ? '包裹' : '郵件';
    const itemEmoji = itemLabel === '包裹' ? '📦' : '📩';

    // Placement logic
    let placementText = '';
    if (isOffice && itemLabel === '郵件') {
      placementText = `今日信件，幫您投遞到您的辦公室信箱內。`;
    } else {
      const floorStr = matchedUser.preferredFloor || '櫃檯';
      placementText = `我們已將您的${itemLabel}放置於您所在樓層的${floorStr}，方便您隨時親自前來領取。`;
    }

    // ID line for Business Registration
    const idLine = isBusinessReg ? `\n您的取信編號【#${matchedUser.customerId}】` : '';

    // Assisted Services Logic
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
      // Basic Business Reg
      servicesSection = `
💡 如您暫時不便親自前來，我們也可提供以下協助服務（僅限緊急情況）：
協助轉寄${itemLabel}（運費另計，請提供完整收件地址及寄送方式，例如是否急件）
`;
    }

    // Main Template
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

  const handleCopyImage = async () => {
    if (!imageUrl) return;
    setImgCopyStatus('loading');
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      const img = new Image();
      const objectUrl = URL.createObjectURL(blob);
      img.src = objectUrl;
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context failed');
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(async (pngBlob) => {
        if (pngBlob) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': pngBlob })
            ]);
            setImgCopyStatus('copied');
            setTimeout(() => setImgCopyStatus('idle'), 2000);
          } catch (clipErr) {
            console.error('Clipboard write error:', clipErr);
            alert('系統限制：此瀏覽器不支援直接複製圖片。請長按圖片手動儲存並轉傳。');
            setImgCopyStatus('idle');
          }
        }
        URL.revokeObjectURL(objectUrl);
      }, 'image/png');

    } catch (err) {
      console.error('Image copy failed:', err);
      alert('掃描圖處理失敗。建議直接長按圖片儲存後，再於 LINE 中傳送附件。');
      setImgCopyStatus('idle');
    }
  };

  const handleAction = async (status: MailProcessingStatus, label: string) => {
    setActionLoading(status);
    await new Promise(resolve => setTimeout(resolve, 400));
    try {
      onMarkAsNotified?.(status);
    } catch (err) {
      alert("處置失敗，請重試");
    } finally {
      setActionLoading(null);
    }
  };

  const openDashboard = () => {
    if (!isMatched) return alert('請先搜尋並配對客戶，才能開啟處置儀表板。');
    onOpenDashboard?.(matchedUser);
  };

  const filteredUsers = allCustomers.filter(user => 
    user.name.includes(searchQuery) || 
    user.company.includes(searchQuery) || 
    (user.customerId && user.customerId.toString().includes(searchQuery))
  );

  const canProcess = (currentStatus === 'pending' || currentStatus === 'notified') && !isArchived;

  // 定義所有可能的處置按鈕
  const allActions = [
    { id: 'scanned', label: '數位掃描', icon: '📧', color: 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100' },
    { id: 'move_to_1f', label: '1F 轉交', icon: '🚚', color: 'bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-100' },
    { id: 'at_counter_12', label: '12F 櫃台', icon: '🏢', color: 'bg-teal-50 text-teal-600 border-teal-100 hover:bg-teal-100' },
    { id: 'at_counter', label: '21F 櫃台', icon: '📍', color: 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100' },
    { id: 'at_counter_27', label: '27F 櫃台', icon: '🏢', color: 'bg-cyan-50 text-cyan-600 border-cyan-100 hover:bg-cyan-100' },
    { id: 'scheduled', label: '月底寄送', icon: '📦', color: 'bg-purple-50 text-purple-600 border-purple-100 hover:bg-purple-100' },
    { id: 'discarded', label: '碎紙銷毀', icon: '✂️', color: 'bg-gray-50 text-gray-600 border-gray-100 hover:bg-gray-100' },
  ];

  // 根據客戶館別動態過濾按鈕
  const displayedActions = allActions.filter(action => {
    if (!isMatched) return true; // 未匹配時顯示所有選項供手動處理
    if (matchedUser.venue === '民權館') {
      return action.id !== 'at_counter_12';
    }
    if (matchedUser.venue === '四維館') {
      return action.id !== 'at_counter' && action.id !== 'at_counter_27';
    }
    return true;
  });

  return (
    <div className={`w-full bg-white rounded-[48px] overflow-hidden border border-gray-100 shadow-2xl mb-8 relative animate-in fade-in duration-500 ${isArchived ? 'opacity-90' : ''}`}>
      
      {/* 標頭 */}
      <div className={`px-8 pt-8 pb-6 flex items-center justify-between transition-colors duration-500 ${isArchived ? 'bg-[#4B4B4B] text-white' : isMatched ? 'bg-indigo-600 text-white' : 'bg-red-500 text-white'}`}>
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-xl border border-white/20 shadow-inner">
            {displayId}
          </div>
          <div className="flex flex-col">
            <p className="font-black text-lg tracking-tight">
              {isMatched ? `${matchedUser.company} / ${matchedUser.name}` : '未知收件人 (請手動配對)'}
            </p>
            <p className="text-[10px] font-black opacity-70 uppercase tracking-widest mt-0.5">
              {isArchived ? `已歸檔處理紀錄 (${currentStatus.toUpperCase()})` : canProcess ? '等待處置分流' : `目前狀態：${currentStatus.toUpperCase()}`}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          {!isArchived && <button onClick={() => setIsSearching(!isSearching)} className="w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-white/10 transition-all">🔍</button>}
          <button onClick={onDelete} className="w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-white/10 transition-all text-xl">✕</button>
        </div>
      </div>

      {isSearching && (
        <div className="p-4 bg-gray-50 border-b animate-in slide-in-from-top-4">
          <input className="w-full p-4 bg-white border border-gray-100 rounded-3xl text-sm font-bold shadow-inner outline-none focus:ring-2 focus:ring-indigo-500" placeholder="搜尋客戶編號、姓名或公司..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          <div className="mt-3 max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
            {filteredUsers.map(user => (
              <div key={user.lineUserId} onClick={() => { onUpdateMatch?.(user); setIsSearching(false); }} className="p-4 bg-white hover:bg-indigo-50 text-xs rounded-2xl cursor-pointer flex justify-between items-center border border-transparent hover:border-indigo-100">
                <span className="font-black text-gray-700">#{user.customerId} - {user.company} / {user.name}</span>
                <span className="bg-indigo-600 text-white px-4 py-1.5 rounded-xl font-black text-[9px]">配對</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-8">
        <div className="flex flex-col md:flex-row gap-8 mb-10">
          {imageUrl && (
            <div className="w-full md:w-56 h-56 bg-gray-100 rounded-[40px] overflow-hidden shadow-2xl flex-shrink-0 border-4 border-white relative group">
              <img src={imageUrl} className="w-full h-full object-cover" alt="mail" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                 <p className="text-white text-[10px] font-black uppercase tracking-widest">可點擊下方複製</p>
              </div>
            </div>
          )}
          <div className="flex-1">
            <div className="p-8 bg-gray-50/50 rounded-[40px] border border-gray-100 text-[13px] text-gray-600 leading-relaxed font-bold whitespace-pre-wrap shadow-inner relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-20 group-hover:opacity-100 transition-opacity"></div>
              {finalReply}
            </div>
          </div>
        </div>
        
        {!isArchived && (
          <div className="flex flex-col space-y-3">
            <button 
              onClick={handleCopyAndForward} 
              className={`w-full py-6 rounded-[32px] font-black text-sm shadow-2xl transition-all flex items-center justify-center space-x-4 ${isNotified ? 'bg-indigo-50 text-indigo-400 border border-indigo-100' : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:-translate-y-1'}`}
            >
              <span className="text-2xl">{copyStatus === 'copied' ? '✅' : '📲'}</span>
              <span className="tracking-wide">{copyStatus === 'copied' ? '內容已複製！' : '複製通知並開啟 LINE 發送'}</span>
            </button>
            
            {imageUrl && (
              <button 
                onClick={handleCopyImage}
                disabled={imgCopyStatus === 'loading'}
                className={`w-full py-4 rounded-[24px] font-black text-[11px] uppercase tracking-[0.2em] transition-all flex items-center justify-center space-x-3 border-2 ${imgCopyStatus === 'copied' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-emerald-50' : 'bg-white text-indigo-500 border-indigo-50 hover:bg-indigo-50 shadow-sm'} ${imgCopyStatus === 'loading' ? 'opacity-70 animate-pulse' : ''}`}
              >
                <span>{imgCopyStatus === 'copied' ? '✅' : imgCopyStatus === 'loading' ? '⏳' : '📎'}</span>
                <span>{imgCopyStatus === 'copied' ? '掃描原圖已複製' : imgCopyStatus === 'loading' ? '正在處理圖片格式...' : '附加掃描原圖 (複製圖片附件)'}</span>
              </button>
            )}
          </div>
        )}

        {canProcess && (
          <div className="pt-10 border-t border-gray-100 mt-10">
            <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] mb-6 text-center">任務分流與處置中心</h4>
            <div className={`grid grid-cols-2 sm:grid-cols-3 ${displayedActions.length > 4 ? 'md:grid-cols-6' : 'md:grid-cols-4'} gap-4`}>
              {displayedActions.map((action) => (
                <button 
                  key={action.id}
                  disabled={actionLoading !== null}
                  onClick={() => handleAction(action.id as MailProcessingStatus, action.label)}
                  className={`flex flex-col items-center justify-center p-5 rounded-[30px] border-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 ${action.color} ${actionLoading === action.id ? 'animate-pulse scale-95 border-indigo-400 bg-white' : ''}`}
                >
                  {actionLoading === action.id ? (
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                  ) : (
                    <span className="text-2xl mb-2">{action.icon}</span>
                  )}
                  <span className="text-[10px] font-black tracking-tighter uppercase whitespace-nowrap">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <button 
          onClick={openDashboard}
          className="w-full mt-8 py-5 bg-white text-gray-400 rounded-[32px] text-[11px] font-black uppercase tracking-widest hover:bg-indigo-50 hover:text-indigo-600 transition-all border-2 border-dashed border-gray-100 shadow-sm"
        >
          查看歷史處置儀表板 ➔
        </button>
      </div>
    </div>
  );
};

export default NotificationDisplay;
