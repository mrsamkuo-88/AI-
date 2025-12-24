
import React, { useState, useEffect, useRef } from 'react';
import { MatchedUser, MailLogEntry, MailProcessingStatus } from '../types';

interface CustomerDashboardProps {
  customer: MatchedUser;
  logs: MailLogEntry[];
  onUpdateCustomer: (updated: MatchedUser) => void;
  onDeleteCustomer: (customerId: string) => void;
  onProcessMail: (logId: string, status: MailProcessingStatus, isArchived?: boolean) => void;
  onClose: () => void;
}

interface LogActionState {
  status: MailProcessingStatus;
  customText: string;
}

const ADMIN_PASSWORD = 'mail5286';
const TAG_OPTIONS = ['Basic', 'MVP', 'VIP'];
const VENUE_OPTIONS = ['四維館', '民權館'];
const PRODUCT_CATEGORY_OPTIONS = ['工商登記', '辦公室'];

const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ 
  customer, 
  logs, 
  onUpdateCustomer,
  onDeleteCustomer,
  onProcessMail, 
  onClose 
}) => {
  const [editingCustomer, setEditingCustomer] = useState<MatchedUser>({ ...customer });
  const [logStates, setLogStates] = useState<Record<string, LogActionState>>({});
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [isEditLocked, setIsEditLocked] = useState(true);
  
  const historyRef = useRef<HTMLElement>(null);

  // 密碼驗證狀態
  const [showPwdModal, setShowPwdModal] = useState<string | null>(null); 
  const [inputPwd, setInputPwd] = useState('');
  const [pwdError, setPwdError] = useState(false);

  const isDeleting = showPwdModal === 'DELETE_CUSTOMER';
  const isUnlocking = showPwdModal === 'UNLOCK_EDIT';

  // 過濾日誌
  const customerLogs = logs.filter(l => l.analysis.matchedUser?.customerId === customer.customerId);
  const activeLogs = customerLogs.filter(l => !l.isArchived);
  const historyLogs = customerLogs.filter(l => l.isArchived).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // 本月統計與費用計算 (每月1號重置)
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const isThisMonth = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  };

  const monthlyLogs = [...activeLogs, ...historyLogs].filter(l => isThisMonth(l.timestamp));
  const monthlyScanCount = monthlyLogs.filter(l => l.processingStatus === 'scanned').length;
  const monthlyScheduledCount = monthlyLogs.filter(l => l.processingStatus === 'scheduled').length;

  // 計算超額費用
  const extraScans = Math.max(0, monthlyScanCount - (customer.freeScans || 0));
  const extraDeliveries = Math.max(0, monthlyScheduledCount - (customer.freeDeliveries || 0));
  const currentMonthFees = (extraScans * (customer.scanFee || 0)) + (extraDeliveries * (customer.deliveryFee || 0));
  const totalDisplayFees = (customer.unpaidFees || 0) + currentMonthFees;

  const stats = {
    scanned: monthlyScanCount,
    scheduled: monthlyScheduledCount,
    f1: activeLogs.filter(l => l.processingStatus === 'move_to_1f').length,
    f12: activeLogs.filter(l => l.processingStatus === 'at_counter_12').length,
    f21: activeLogs.filter(l => l.processingStatus === 'at_counter').length,
    f27: activeLogs.filter(l => l.processingStatus === 'at_counter_27').length,
    history: historyLogs.length
  };

  useEffect(() => {
    const initialState: Record<string, LogActionState> = { ...logStates };
    activeLogs.forEach(log => {
      if (!initialState[log.id]) {
        let defaultStatus: MailProcessingStatus = 'at_counter';
        if (customer.preferredFloor === '27樓櫃檯') defaultStatus = 'at_counter_27';
        else if (customer.preferredFloor === '12樓櫃檯') defaultStatus = 'at_counter_12';
        
        if (log.processingStatus !== 'pending' && log.processingStatus !== 'notified') {
            defaultStatus = log.processingStatus as MailProcessingStatus;
        }

        initialState[log.id] = {
          status: defaultStatus,
          customText: generateDefaultReply(log, defaultStatus)
        };
      }
    });
    setLogStates(initialState);
  }, [activeLogs.length, customer.customerId]);

  function generateDefaultReply(log: MailLogEntry, action: MailProcessingStatus) {
    const isVip = customer.tags?.includes('VIP');
    const isMvp = customer.tags?.includes('MVP');
    const isOffice = customer.productCategory === '辦公室';
    const isBusinessReg = customer.productCategory === '工商登記';
    const itemLabel = log.analysis.summary.includes('包裹') ? '包裹' : '郵件';
    const itemEmoji = itemLabel === '包裹' ? '📦' : '📩';
    
    // 強化問候語
    let salutation = `${customer.name} 您好 👋`;
    if (isVip) salutation = `親愛的道騰尊榮 VIP ${customer.name} 您好 👑`;
    else if (isMvp) salutation = `道騰傑出 MVP ${customer.name} 您好 ✨`;

    const placement = isOffice && itemLabel === '郵件' 
      ? '今日信件，幫您投遞到您的辦公室信箱內。' 
      : `我們已將您的${itemLabel}放置於您所在樓層的櫃檯（21F/27F），方便您隨時親自前來領取。`;

    // 工商登記 MVP/VIP 專用服務區塊
    let servicesSection = '';
    if (isBusinessReg && (isVip || isMvp)) {
      const tierLabel = isVip ? '尊榮 VIP' : '傑出 MVP';
      servicesSection = `\n💡 如您暫時不便親自前來，我們為${tierLabel}會員特別提供以下專屬郵件處理服務（請選擇適合您的選項，直接回覆本訊息告知，我們將優先為您處理）：
① 待您方便時親自前來櫃檯領取（目前項目置放於此）
② 協助移置至一樓信件自取區，方便您更彈性取件
③ 統一於月底為您轉寄至指定地址（運費另計，請提供完整收件資訊）
④ 先開封掃描內容並以電子檔方式傳送給您（確保隱私安全）
⑤ 若您判斷為非重要項目，可授權我們直接銷毀處理
我們將根據您的指示，盡快為您安排，確保服務高效且安心。`;
    } else if (isVip) {
       // 非工商登記但也是 VIP 的備用簡短版
       servicesSection = `\n\n💎 【VIP 尊榮禮遇】\n身為道騰尊崇 VIP，您的郵件享有最高優先處理權。如需即時快遞配送至指定地點，或需高解析掃描存檔服務，請隨時回覆此訊息，專屬秘書將立即為您效勞。`;
    }

    return `${salutation}，
這裡有一件您的「${itemLabel}」已送達 ${itemEmoji}。
${placement}${isBusinessReg ? '\n您的取信編號【#' + customer.customerId + '】' : ''}
道騰致力提供最專業的服務給您，如有任何需求，歡迎隨時聯繫我們。
${servicesSection}
祝您有個美好的一天！✨
✨ 道騰 DT Space 智能郵務管家 敬上`;
  }

  const confirmActionWithPwd = async () => {
    if (inputPwd === ADMIN_PASSWORD) {
      if (isDeleting) {
        onDeleteCustomer(customer.customerId);
        onClose();
      } else if (isUnlocking) {
        setIsEditLocked(false);
        setShowPwdModal(null);
        setInputPwd('');
        setPwdError(false);
      } else {
        const logId = showPwdModal!;
        const state = logStates[logId];
        await navigator.clipboard.writeText(state.customText);
        onProcessMail(logId, state.status, true); 
        setShowPwdModal(null);
        setInputPwd('');
        setPwdError(false);
      }
    } else {
      setPwdError(true);
      setTimeout(() => setPwdError(false), 500);
    }
  };

  const handleSettleBalance = () => {
    if (confirm('確定要執行帳單結清嗎？結清後「待結清金額」將歸零。')) {
      const updated = { ...editingCustomer, unpaidFees: 0 };
      setEditingCustomer(updated);
      onUpdateCustomer(updated);
    }
  };

  const isMvpOrVip = editingCustomer.tags?.some(tag => ['MVP', 'VIP'].includes(tag));

  const statsItems = [
    { id: 'f1', label: '1F 存放', count: stats.f1, color: 'bg-[#FF9100]', icon: '🚚' },
    { id: 'f12', label: '12F 櫃台', count: stats.f12, color: 'bg-[#00897B]', icon: '🏢', venue: '四維館' },
    { id: 'f21', label: '21F 櫃台', count: stats.f21, color: 'bg-[#00BFA5]', icon: '📍', venue: '民權館' },
    { id: 'f27', label: '27F 櫃台', count: stats.f27, color: 'bg-[#009688]', icon: '🏢', venue: '民權館' },
    { id: 'scanned', label: '數位掃描', count: stats.scanned, color: 'bg-[#3D5AFE]', icon: '📧', fee: extraScans * (customer.scanFee || 0) },
    { id: 'scheduled', label: '月底寄送', count: stats.scheduled, color: 'bg-[#AA00FF]', icon: '📦', fee: extraDeliveries * (customer.deliveryFee || 0) },
    { id: 'history', label: '歸檔紀錄', count: stats.history, color: 'bg-[#546E7A]', icon: '📜' },
  ].filter(item => !item.venue || item.venue === editingCustomer.venue);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-8 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
      
      {showPwdModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className={`bg-white rounded-[60px] p-12 w-full max-w-lg shadow-2xl transition-transform ${pwdError ? 'animate-bounce' : ''} flex flex-col items-center`}>
            
            <h3 className="text-3xl font-black text-center mb-4 flex items-center justify-center gap-3 text-gray-900">
              {isDeleting ? '🚨 危險操作：刪除客戶驗證' : isUnlocking ? '🔓 客戶資訊編輯解鎖' : '🔒 處置安全驗證'}
            </h3>
            
            <p className="text-sm text-gray-400 text-center mb-12 font-bold uppercase tracking-wider">
              {isDeleting ? '此動作將永久移除客戶所有資料' : isUnlocking ? '請輸入密碼以開啟編輯權限' : '請輸入授權密碼以執行結案'}
            </p>
            
            <input 
              type="password" autoFocus
              className={`w-full p-8 bg-[#F9F9FB] rounded-[35px] border-none text-center text-4xl font-black tracking-[0.6em] outline-none transition-all shadow-inner mb-12 placeholder:text-gray-200 ${pwdError ? 'ring-2 ring-rose-400' : ''}`}
              placeholder="••••••••"
              value={inputPwd}
              onChange={e => setInputPwd(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && confirmActionWithPwd()}
            />
            
            <div className="flex gap-5 w-full">
              <button 
                onClick={() => { setShowPwdModal(null); setInputPwd(''); }} 
                className="flex-1 py-7 bg-[#F2F4F7] text-[#98A2B3] rounded-[35px] font-black text-xl transition-all active:scale-95"
              >
                取消
              </button>
              <button 
                onClick={confirmActionWithPwd} 
                className={`flex-1 py-7 text-white rounded-[35px] font-black text-xl transition-all active:scale-95 shadow-xl ${isDeleting ? 'bg-[#C01033] shadow-rose-100 hover:bg-[#A00E2B]' : 'bg-indigo-600 shadow-indigo-100 hover:bg-indigo-700'}`}
              >
                {isDeleting ? '確認刪除' : isUnlocking ? '確認解鎖' : '確認授權'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#F8F9FE] w-full max-w-6xl h-[95vh] rounded-[56px] shadow-2xl overflow-hidden flex flex-col border border-white/30 animate-in zoom-in-95">
        
        <div className="bg-[#3D48B8] p-8 pt-12 text-white relative flex-shrink-0">
          {isEditLocked && (
            <div className="absolute top-4 right-20 bg-amber-500/90 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg animate-pulse z-10">
              👁️ 預覽模式：編輯已鎖定
            </div>
          )}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center space-x-6">
              <div className="w-20 h-20 bg-white/20 rounded-[30px] flex items-center justify-center shadow-inner border border-white/10 backdrop-blur-md">
                <span className="text-3xl font-black">✉️</span>
              </div>
              <div>
                <input
                  type="text"
                  readOnly={isEditLocked}
                  className={`bg-transparent border-none text-4xl font-black tracking-tight leading-none mb-3 w-full outline-none focus:ring-1 focus:ring-white/30 rounded px-1 -ml-1 ${isEditLocked ? 'cursor-default' : 'cursor-text'}`}
                  value={editingCustomer.company}
                  onChange={e => {
                    const updated = { ...editingCustomer, company: e.target.value };
                    setEditingCustomer(updated);
                    onUpdateCustomer(updated);
                  }}
                />
                <div className="flex items-center space-x-3">
                  <input
                    type="text"
                    readOnly={isEditLocked}
                    className={`bg-transparent border-none text-xl font-bold text-white/80 outline-none focus:ring-1 focus:ring-white/30 rounded px-1 -ml-1 ${isEditLocked ? 'cursor-default' : 'cursor-text'}`}
                    value={editingCustomer.name}
                    onChange={e => {
                      const updated = { ...editingCustomer, name: e.target.value };
                      setEditingCustomer(updated);
                      onUpdateCustomer(updated);
                    }}
                  />
                  <div className="bg-indigo-400/30 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border border-white/10">
                    道騰核心資料庫同步中
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
                <button onClick={onClose} className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all border border-white/10">✕</button>
                {totalDisplayFees > 0 && (
                   <div className="bg-rose-500 px-6 py-3 rounded-2xl shadow-xl flex items-center space-x-4 animate-bounce mt-4">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-80">本期未結清餘額</p>
                        <p className="text-xl font-black">${totalDisplayFees}</p>
                      </div>
                      <button 
                        onClick={handleSettleBalance}
                        className="bg-white text-rose-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-colors"
                      >
                        結清帳單
                      </button>
                   </div>
                )}
            </div>
          </div>

          <div className="flex space-x-3 mt-10 overflow-x-auto no-scrollbar pb-2">
            {statsItems.map(item => (
              <div 
                key={item.id} 
                onClick={() => item.id === 'history' && historyRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className={`${item.color} p-5 min-w-[160px] rounded-[32px] shadow-lg border border-white/10 transition-transform active:scale-95 cursor-pointer relative overflow-hidden group`}
              >
                <div className="relative z-10">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-80">{item.label}</span>
                    <span className="text-xl group-hover:scale-110 transition-transform">{item.icon}</span>
                  </div>
                  <div className="text-3xl font-black">{item.count} <span className="text-[10px] opacity-60 font-medium uppercase tracking-tighter">ITEMS</span></div>
                  {(item.id === 'scanned' || item.id === 'scheduled') && (
                      <div className="mt-2 text-[9px] font-black bg-black/20 py-1 px-2 rounded-lg inline-block">
                        本月累計費用: <span className={item.fee! > 0 ? "text-yellow-300" : "text-white"}>${item.fee}</span>
                      </div>
                  )}
                  {(item.id === 'scanned' || item.id === 'scheduled') && (
                      <div className="text-[8px] font-bold opacity-60 mt-1 uppercase italic">1號自動重置計數</div>
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 text-6xl opacity-10 grayscale group-hover:rotate-12 transition-transform">{item.icon}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row relative">
          {/* 鎖定提示層 */}
          {isEditLocked && (
            <div className="absolute top-4 right-8 z-20 flex flex-col items-end gap-2">
               <p className="bg-white/90 backdrop-blur px-4 py-2 rounded-2xl text-[11px] font-black text-indigo-600 shadow-xl border border-indigo-100 animate-bounce">
                  這個頁面要編輯客戶資訊都需要輸入密碼，否則只能以預覽模式進行
               </p>
               <button 
                onClick={() => setShowPwdModal('UNLOCK_EDIT')}
                className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-2"
               >
                 <span>🔓</span> 解鎖編輯
               </button>
            </div>
          )}

          <div className="w-full lg:w-[320px] bg-white border-r border-gray-100 p-8 space-y-8 overflow-y-auto custom-scrollbar flex flex-col">
            <div className={`flex-1 space-y-8 transition-all duration-500 ${isEditLocked ? 'grayscale opacity-60' : ''}`}>
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex justify-between">
                  <span>⭐ 客戶分層</span>
                  {isEditLocked && <span className="text-rose-400">Locked</span>}
                </h3>
                <div className="flex gap-2">
                  {TAG_OPTIONS.map(tag => (
                    <button
                      key={tag}
                      disabled={isEditLocked}
                      onClick={() => { const updated = { ...editingCustomer, tags: [tag] }; setEditingCustomer(updated); onUpdateCustomer(updated); }}
                      className={`flex-1 py-3 rounded-2xl text-[10px] font-black transition-all border-2 ${editingCustomer.tags?.includes(tag) ? 'bg-[#3D48B8] border-[#3D48B8] text-white shadow-md' : 'bg-white border-gray-100 text-gray-400'}`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-gray-50">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex justify-between">
                  <span>🏛️ 館別</span>
                </h3>
                <div className="flex gap-2">
                  {VENUE_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      disabled={isEditLocked}
                      onClick={() => { const updated = { ...editingCustomer, venue: opt }; setEditingCustomer(updated); onUpdateCustomer(updated); }}
                      className={`flex-1 py-3 rounded-2xl text-[10px] font-black transition-all border-2 ${editingCustomer.venue === opt ? 'bg-[#3D48B8] border-[#3D48B8] text-white shadow-md' : 'bg-white border-gray-100 text-gray-400'}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-gray-50">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex justify-between">
                  <span>🏢 產品類別</span>
                </h3>
                <div className="flex gap-2">
                  {PRODUCT_CATEGORY_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      disabled={isEditLocked}
                      onClick={() => { const updated = { ...editingCustomer, productCategory: opt }; setEditingCustomer(updated); onUpdateCustomer(updated); }}
                      className={`flex-1 py-3 rounded-2xl text-[10px] font-black transition-all border-2 ${editingCustomer.productCategory === opt ? 'bg-[#3D48B8] border-[#3D48B8] text-white shadow-md' : 'bg-white border-gray-100 text-gray-400'}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {isMvpOrVip && (
                <div className="space-y-5 pt-4 border-t border-gray-50">
                  <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">🎁 會員專屬額度與費用</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-gray-400 ml-1">每月免費掃描</label>
                      <input 
                        type="number"
                        readOnly={isEditLocked}
                        className="w-full px-3 py-2 bg-indigo-50/50 rounded-xl text-xs font-bold"
                        value={editingCustomer.freeScans || 0}
                        onChange={e => { const updated = { ...editingCustomer, freeScans: parseInt(e.target.value) || 0 }; setEditingCustomer(updated); onUpdateCustomer(updated); }}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-gray-400 ml-1">超額掃描單價</label>
                      <input 
                        type="number"
                        readOnly={isEditLocked}
                        className="w-full px-3 py-2 bg-indigo-50/50 rounded-xl text-xs font-bold"
                        value={editingCustomer.scanFee || 0}
                        onChange={e => { const updated = { ...editingCustomer, scanFee: parseInt(e.target.value) || 0 }; setEditingCustomer(updated); onUpdateCustomer(updated); }}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-gray-400 ml-1">每月免費寄送</label>
                      <input 
                        type="number"
                        readOnly={isEditLocked}
                        className="w-full px-3 py-2 bg-indigo-50/50 rounded-xl text-xs font-bold"
                        value={editingCustomer.freeDeliveries || 0}
                        onChange={e => { const updated = { ...editingCustomer, freeDeliveries: parseInt(e.target.value) || 0 }; setEditingCustomer(updated); onUpdateCustomer(updated); }}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-gray-400 ml-1">超額寄送單價</label>
                      <input 
                        type="number"
                        readOnly={isEditLocked}
                        className="w-full px-3 py-2 bg-indigo-50/50 rounded-xl text-xs font-bold"
                        value={editingCustomer.deliveryFee || 0}
                        onChange={e => { const updated = { ...editingCustomer, deliveryFee: parseInt(e.target.value) || 0 }; setEditingCustomer(updated); onUpdateCustomer(updated); }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-5 pt-4 border-t border-gray-50">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">📂 聯絡資訊</h3>
                <div className="space-y-4">
                  {[
                    { id: 'phone', label: '聯絡電話', icon: '📞' },
                    { id: 'email', label: '主要信箱', icon: '✉️' },
                    { id: 'address', label: '郵寄地址', icon: '📍' },
                  ].map(field => (
                    <div key={field.id} className="space-y-1.5">
                      <label className="text-[9px] font-black text-gray-400 ml-1 uppercase">{field.label}</label>
                      <input 
                        readOnly={isEditLocked}
                        className={`w-full px-5 py-3 bg-gray-50 border-none rounded-2xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-indigo-50 outline-none transition-all ${isEditLocked ? 'cursor-default' : 'cursor-text'}`}
                        value={(editingCustomer as any)[field.id] || ''}
                        onChange={e => { const updated = { ...editingCustomer, [field.id]: e.target.value }; setEditingCustomer(updated); onUpdateCustomer(updated); }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-gray-50 flex flex-col items-center">
              <button 
                onClick={() => setShowPwdModal('DELETE_CUSTOMER')}
                className="w-full py-5 px-6 bg-[#FFF1F3] text-[#C01033] rounded-[24px] text-[12px] font-black uppercase tracking-widest border border-rose-100 hover:bg-[#C01033] hover:text-white hover:border-[#C01033] transition-all active:scale-95 flex items-center justify-center space-x-3 shadow-sm"
              >
                <span className="text-lg">🗑️</span>
                <span>刪除此客戶檔案</span>
              </button>
              <p className="text-[9px] text-gray-300 text-center mt-4 font-black uppercase tracking-widest opacity-60">此操作需要管理員驗證</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col bg-[#F9FAFF] overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-12 custom-scrollbar">
              <section className="space-y-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-1.5 h-6 bg-[#3D48B8] rounded-full"></div>
                  <h3 className="text-xl font-black text-gray-800 tracking-tight">當前庫存項目 ({activeLogs.length})</h3>
                </div>
                {activeLogs.length === 0 ? (
                  <div className="py-20 text-center bg-white/50 rounded-[40px] border-2 border-dashed border-gray-100 opacity-30">
                    <p className="font-black text-xs uppercase tracking-[0.2em] text-gray-400">目前暫無待處分項目</p>
                  </div>
                ) : (
                  activeLogs.map(log => (
                    <div key={log.id} className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-6 flex flex-col md:flex-row gap-6">
                      {log.imageUrl && <img src={log.imageUrl} className="w-full md:w-32 h-32 rounded-[24px] object-cover border-2 border-gray-50" />}
                      <div className="flex-1 space-y-4">
                        <textarea
                          className="w-full bg-gray-50 border-none rounded-[24px] p-5 text-xs font-bold text-gray-600 outline-none min-h-[100px]"
                          value={logStates[log.id]?.customText || ''}
                          readOnly
                        />
                        <div className="flex justify-end">
                          <button onClick={() => setShowPwdModal(log.id)} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg">確認處置並結案 ➔</button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </section>

              <section ref={historyRef} className="space-y-4 pt-10 border-t border-gray-200">
                <h3 className="text-xl font-black text-gray-800 tracking-tight">歷史紀錄 ({historyLogs.length})</h3>
                <div className="space-y-3">
                  {historyLogs.map(log => (
                    <div key={log.id} className="bg-white rounded-[40px] p-4 border border-gray-100 flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs">📜</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-gray-400 uppercase">{new Date(log.timestamp).toLocaleDateString()}</p>
                        <p className="text-sm font-bold text-gray-700 truncate">{log.analysis.summary}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
