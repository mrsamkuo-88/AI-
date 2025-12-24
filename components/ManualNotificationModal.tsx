
import React, { useState, useEffect } from 'react';
import { MatchedUser } from '../types';

interface ManualNotificationModalProps {
  customers: MatchedUser[];
  onClose: () => void;
}

type NotificationType = 'parcel' | 'mail' | 'urgent' | 'other';

const ManualNotificationModal: React.FC<ManualNotificationModalProps> = ({ customers, onClose }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<MatchedUser | null>(null);
  const [selectedType, setSelectedType] = useState<NotificationType>('mail');
  const [previewText, setPreviewText] = useState('');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

  const filteredCustomers = customers.filter(c => 
    c.name.includes(searchTerm) || 
    c.company.includes(searchTerm) || 
    c.customerId.includes(searchTerm)
  );

  const types = [
    { id: 'parcel', label: '包裹', icon: '📦' },
    { id: 'mail', label: '郵件', icon: '📩' },
    { id: 'urgent', label: '緊急', icon: '🚨' },
    { id: 'other', label: '其他', icon: '🎁' },
  ];

  useEffect(() => {
    if (selectedCustomer) {
      generatePreview();
    }
  }, [selectedCustomer, selectedType]);

  const generatePreview = () => {
    if (!selectedCustomer) return;

    const isVip = selectedCustomer.tags?.includes('VIP');
    const isMvp = selectedCustomer.tags?.includes('MVP');
    const isOffice = selectedCustomer.productCategory === '辦公室';
    const isBusinessReg = selectedCustomer.productCategory === '工商登記';
    const isMvpOrVip = isVip || isMvp;
    
    // Determine Salutation
    let salutation = `${selectedCustomer.name} 您好 👋`;
    if (isVip) salutation = `親愛的道騰尊榮 VIP ${selectedCustomer.name} 您好 👑`;
    else if (isMvp) salutation = `道騰傑出 MVP ${selectedCustomer.name} 您好 ✨`;

    // Item Description based on selection
    let itemLabel = '物品';
    let itemEmoji = '🎁';
    switch (selectedType) {
      case 'parcel': itemLabel = '包裹'; itemEmoji = '📦'; break;
      case 'mail': itemLabel = '郵件'; itemEmoji = '📩'; break;
      case 'urgent': itemLabel = '緊急文件/包裹'; itemEmoji = '🚨'; break;
      case 'other': itemLabel = '物品'; itemEmoji = '🎁'; break;
    }

    // Placement logic
    let placementText = '';
    if (isOffice && selectedType === 'mail') {
      placementText = `今日信件，幫您投遞到您的辦公室信箱內。`;
    } else {
      placementText = `我們已將您的${itemLabel}放置於您所在樓層的櫃檯（21F/27F），方便您隨時親自前來領取。`;
    }

    // ID line for Business Registration
    const idLine = isBusinessReg ? `\n您的取信編號【#${selectedCustomer.customerId}】` : '';

    // Assisted Services Logic: 這裡同步 NotificationDisplay 的 5 項尊榮服務邏輯
    let servicesSection = '';
    if (isBusinessReg && isMvpOrVip) {
      const tierLabel = isVip ? '尊榮 VIP' : '傑出 MVP';
      servicesSection = `
💡 如您暫時不便親自前來，我們為${tierLabel} 會員特別提供以下專屬${itemLabel}處理服務（請選擇適合您的選項，直接回覆本訊息告知，我們將優先為您處理）：
① 待您方便時親自前來 21 樓櫃檯領取（目前信件置放於此）
② 協助移置至一樓信件自取區，方便您更彈性取件
③ 統一於月底為您轉寄至指定地址（運費另計，請提供完整收件資訊）
④ 先開封掃描內容並以電子檔方式傳送給您（確保隱私安全）
⑤ 若您判斷為非重要信件，可授權我們直接銷毀處理
我們將根據您的指示，盡快為您安排，確保服務高效且安心。`;
    } else if (isBusinessReg) {
      servicesSection = `
💡 如您暫時不便親自前來，我們也可提供以下協助服務（僅限緊急情況）：
協助轉寄${itemLabel}（運費另計，請提供完整收件地址及寄送方式，例如是否急件）
`;
    } else {
      // 其他類別客戶的預設結尾
      servicesSection = `\n請直接回覆此訊息告知您的需求，我們將盡快為您處理。`;
    }

    // Main Template - 完全對齊用戶要求的「正確訊息」格式
    const body = `${salutation}，

這裡有一件您的「${itemLabel}」已送達 ${itemEmoji}。
${placementText}${idLine}
道騰致力提供最專業的服務給您，如有任何需求，歡迎隨時聯繫我們。
${servicesSection}

祝您有個美好的一天！✨
✨ 道騰 DT Space 智能郵務管家 敬上`;

    setPreviewText(body);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(previewText);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
      if (confirm('通知內容已複製！是否開啟 LINE？')) window.location.href = 'https://line.me/R/';
    } catch (err) {
      alert('複製失敗');
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#F8F9FE] w-full max-w-xl rounded-[56px] shadow-2xl overflow-hidden flex flex-col border border-white/30 animate-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-indigo-600 p-8 text-white relative">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black tracking-tight">手動發送通知</h2>
              <p className="text-[10px] font-black opacity-70 uppercase tracking-widest mt-1">Manual Notification Wizard</p>
            </div>
            <button onClick={onClose} className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all">✕</button>
          </div>
          
          {/* Progress Dots */}
          <div className="flex space-x-2 mt-8">
            {[1, 2, 3].map(i => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${step >= i ? 'w-8 bg-white' : 'w-2 bg-white/20'}`}></div>
            ))}
          </div>
        </div>

        <div className="p-8 flex-1 overflow-y-auto max-h-[70vh] custom-scrollbar">
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                <h3 className="text-xl font-black text-gray-800 tracking-tight">步驟 1：選擇通知對象</h3>
              </div>
              <div className="bg-white p-2 rounded-3xl shadow-inner border border-gray-100 flex items-center px-4">
                <span className="text-xl mr-3">🔍</span>
                <input 
                  autoFocus
                  className="w-full py-3 bg-transparent outline-none font-bold text-gray-700"
                  placeholder="搜尋編號、姓名、公司..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {filteredCustomers.map(c => {
                  const isOffice = c.productCategory === '辦公室';
                  return (
                    <button 
                      key={c.customerId}
                      onClick={() => { setSelectedCustomer(c); setStep(2); }}
                      className="w-full p-4 bg-white hover:bg-indigo-50 rounded-2xl border border-gray-100 flex items-center justify-between group transition-all"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 font-black text-xs">
                          {isOffice ? '' : '#'}{c.customerId}
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-black text-gray-800">{c.name}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{c.company}</p>
                        </div>
                      </div>
                      <span className="text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity">選擇 →</span>
                    </button>
                  );
                })}
                {filteredCustomers.length === 0 && (
                  <p className="text-center py-10 text-gray-300 font-black text-xs uppercase tracking-widest">找不到相符客戶</p>
                )}
              </div>
            </div>
          )}

          {step === 2 && selectedCustomer && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                <h3 className="text-xl font-black text-gray-800 tracking-tight">步驟 2：選擇通知品項</h3>
              </div>
              <div className="p-4 bg-indigo-50 rounded-3xl flex items-center space-x-4 border border-indigo-100 mb-6">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">👤</div>
                <div>
                  <p className="text-xs font-black text-indigo-600 uppercase tracking-widest">收件人</p>
                  <p className="font-bold text-gray-800">{selectedCustomer.productCategory === '辦公室' ? '' : '#'}{selectedCustomer.customerId} - {selectedCustomer.name}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {types.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setSelectedType(t.id as NotificationType); setStep(3); }}
                    className={`p-6 rounded-[32px] border-2 transition-all flex flex-col items-center justify-center space-y-3 hover:scale-105 active:scale-95 ${selectedType === t.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-white border-gray-50 text-gray-400 hover:border-indigo-100'}`}
                  >
                    <span className="text-4xl">{t.icon}</span>
                    <span className="text-sm font-black uppercase tracking-widest">{t.label}</span>
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setStep(1)}
                className="w-full py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest"
              >
                ← 返回重選客戶
              </button>
            </div>
          )}

          {step === 3 && selectedCustomer && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                <h3 className="text-xl font-black text-gray-800 tracking-tight">步驟 3：預覽內容</h3>
              </div>
              <div className="relative group">
                <textarea
                  className="w-full p-8 bg-gray-50 rounded-[40px] border-none text-[13px] font-bold text-gray-600 leading-relaxed shadow-inner focus:ring-2 focus:ring-indigo-100 transition-all outline-none min-h-[350px]"
                  value={previewText}
                  onChange={e => setPreviewText(e.target.value)}
                />
                <div className="absolute top-4 left-0 w-1 h-12 bg-indigo-500 rounded-r-full"></div>
              </div>
              <button
                onClick={handleCopy}
                className={`w-full py-6 rounded-[32px] font-black text-sm shadow-2xl transition-all flex items-center justify-center space-x-4 ${copyStatus === 'copied' ? 'bg-indigo-50 text-indigo-400 border border-indigo-100' : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:-translate-y-1'}`}
              >
                <span className="text-2xl">{copyStatus === 'copied' ? '✅' : '📲'}</span>
                <span>{copyStatus === 'copied' ? '內容已複製！' : '複製通知並開啟 LINE'}</span>
              </button>
              <div className="flex justify-between">
                <button onClick={() => setStep(2)} className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-indigo-600 transition-colors">← 重選品項</button>
                <button onClick={onClose} className="px-6 py-3 text-[10px] font-black text-rose-400 uppercase tracking-widest hover:text-rose-600 transition-colors">結束通知 ➔</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManualNotificationModal;
