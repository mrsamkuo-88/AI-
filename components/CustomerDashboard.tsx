
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MatchedUser, MailLogEntry, MailProcessingStatus } from '../types';

interface CustomerDashboardProps {
  customer: MatchedUser;
  logs: MailLogEntry[];
  onUpdateCustomer: (updated: MatchedUser, originalCustomerId: string) => void;
  onDeleteCustomer: (customerId: string) => void;
  onProcessMail: (logId: string, status: MailProcessingStatus, isArchived?: boolean) => void;
  onClose: () => void;
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
  const [isEditLocked, setIsEditLocked] = useState(true);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'processed' | 'unprocessed'>('all');
  const [historySearch, setHistorySearch] = useState('');
  
  // Sync editing state if the prop changes (e.g. after save)
  useEffect(() => {
    setEditingCustomer({ ...customer });
  }, [customer]);

  const historyRef = useRef<HTMLElement>(null);
  const [showPwdModal, setShowPwdModal] = useState<string | null>(null); 
  const [inputPwd, setInputPwd] = useState('');
  const [pwdError, setPwdError] = useState(false);

  const isDeleting = showPwdModal === 'DELETE_CUSTOMER';
  const isUnlocking = showPwdModal === 'UNLOCK_EDIT';

  const customerLogs = useMemo(() => 
    logs.filter(l => l.analysis.matchedUser?.customerId === customer.customerId),
    [logs, customer.customerId]
  );

  const activeLogs = useMemo(() => 
    customerLogs.filter(l => !l.isArchived),
    [customerLogs]
  );
  
  const historyLogs = useMemo(() => 
    customerLogs.filter(l => l.isArchived).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [customerLogs]
  );

  // Filtered history list based on the new filters
  const displayedHistory = useMemo(() => {
    return customerLogs.filter(l => {
      // Status Filter
      if (historyFilter === 'processed' && !l.isArchived) return false;
      if (historyFilter === 'unprocessed' && l.isArchived) return false;
      
      // Search Filter
      if (historySearch) {
        const q = historySearch.toLowerCase();
        return (
          (l.analysis.summary || '').toLowerCase().includes(q) ||
          (l.analysis.senderName || '').toLowerCase().includes(q)
        );
      }
      return true;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [customerLogs, historyFilter, historySearch]);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const isThisMonth = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  };

  const monthlyLogs = customerLogs.filter(l => isThisMonth(l.timestamp));
  const monthlyScanCount = monthlyLogs.filter(l => l.processingStatus === 'scanned').length;
  const monthlyScheduledCount = monthlyLogs.filter(l => l.processingStatus === 'scheduled').length;

  const extraScans = Math.max(0, monthlyScanCount - (customer.freeScans || 0));
  const extraDeliveries = Math.max(0, monthlyScheduledCount - (customer.freeDeliveries || 0));
  const currentMonthFees = (extraScans * (customer.scanFee || 0)) + (extraDeliveries * (customer.deliveryFee || 0));
  
  const stats = {
    scanned: monthlyScanCount,
    scheduled: monthlyScheduledCount,
    f1: activeLogs.filter(l => l.processingStatus === 'move_to_1f').length,
    f12: activeLogs.filter(l => l.processingStatus === 'at_counter_12').length,
    f21: activeLogs.filter(l => l.processingStatus === 'at_counter').length,
    f27: activeLogs.filter(l => l.processingStatus === 'at_counter_27').length,
    history: historyLogs.length
  };

  const statsItems = [
    { id: 'f1', label: '1F 存放', count: stats.f1, color: 'bg-[#FF9100]', icon: '🚚' },
    { id: 'f12', label: '12F 櫃台', count: stats.f12, color: 'bg-[#00897B]', icon: '🏢', venue: '四維館' },
    { id: 'f21', label: '21F 櫃台', count: stats.f21, color: 'bg-[#00BFA5]', icon: '📍', venue: '民權館' },
    { id: 'f27', label: '27F 櫃台', count: stats.f27, color: 'bg-[#009688]', icon: '🏢', venue: '民權館' },
    { id: 'scanned', label: '數位掃描', count: stats.scanned, color: 'bg-[#3D5AFE]', icon: '📧', fee: extraScans * (customer.scanFee || 0) },
    { id: 'scheduled', label: '月底寄送', count: stats.scheduled, color: 'bg-[#AA00FF]', icon: '📦', fee: extraDeliveries * (customer.deliveryFee || 0) },
    { id: 'history', label: '歸檔紀錄', count: stats.history, color: 'bg-[#546E7A]', icon: '📜' },
  ].filter(item => !item.venue || item.venue === editingCustomer.venue);

  const confirmActionWithPwd = async () => {
    if (inputPwd === ADMIN_PASSWORD) {
      if (isDeleting) {
        onDeleteCustomer(customer.customerId);
      } else if (isUnlocking) {
        setIsEditLocked(false);
        setShowPwdModal(null);
        setInputPwd('');
        setPwdError(false);
      } else {
        onProcessMail(showPwdModal!, 'pending', true); 
        setShowPwdModal(null);
      }
    } else {
      setPwdError(true);
      setTimeout(() => setPwdError(false), 500);
    }
  };

  const handleSave = () => {
    onUpdateCustomer(editingCustomer, customer.customerId);
    setIsEditLocked(true);
    alert('✅ 客戶資料更新成功');
  };

  const getCategoryIcon = (category?: string) => {
    if (category === '辦公室') return '🏢';
    if (category === '工商登記') return '®️';
    return '';
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-8 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
      
      {showPwdModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className={`bg-white rounded-[60px] p-12 w-full max-w-lg shadow-2xl transition-transform ${pwdError ? 'animate-bounce' : ''} flex flex-col items-center`}>
            <h3 className="text-3xl font-black text-center mb-4 text-gray-900">
              {isDeleting ? '🚨 刪除客戶檔案驗證' : isUnlocking ? '🔓 解鎖編輯權限' : '🔒 處置安全驗證'}
            </h3>
            <p className="text-sm text-gray-400 text-center mb-10 font-bold uppercase tracking-widest">Security Authorization Required</p>
            <input 
              type="password" autoFocus
              className="w-full p-8 bg-[#F9F9FB] rounded-[35px] border-none text-center text-4xl font-black tracking-[0.6em] outline-none shadow-inner mb-12"
              placeholder="••••" value={inputPwd} onChange={e => setInputPwd(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && confirmActionWithPwd()}
            />
            <div className="flex gap-5 w-full">
              <button onClick={() => setShowPwdModal(null)} className="flex-1 py-7 bg-[#F2F4F7] text-[#98A2B3] rounded-[35px] font-black text-xl">取消</button>
              <button onClick={confirmActionWithPwd} className={`flex-1 py-7 text-white rounded-[35px] font-black text-xl shadow-xl ${isDeleting ? 'bg-rose-600' : 'bg-indigo-600'}`}>確認</button>
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
            <div className="flex items-center space-x-6 w-full">
              <div className="w-20 h-20 bg-white/20 rounded-[30px] flex items-center justify-center shadow-inner border border-white/10 backdrop-blur-md flex-shrink-0">
                <span className="text-3xl">
                   {getCategoryIcon(editingCustomer.productCategory) || '✉️'}
                </span>
              </div>
              <div className="flex-1">
                 {!isEditLocked ? (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                             <span className="text-xs font-black uppercase tracking-widest text-white/60">編號</span>
                             <input 
                                value={editingCustomer.customerId} 
                                onChange={e => setEditingCustomer({...editingCustomer, customerId: e.target.value})}
                                className="bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-white font-black w-32 focus:outline-none focus:bg-white/20"
                                placeholder="編號"
                             />
                             <span className="text-xs font-black uppercase tracking-widest text-white/60">公司</span>
                             <input 
                                value={editingCustomer.company} 
                                onChange={e => setEditingCustomer({...editingCustomer, company: e.target.value})}
                                className="bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-white font-black w-full focus:outline-none focus:bg-white/20"
                                placeholder="公司名稱"
                             />
                        </div>
                        <div className="flex items-center gap-2">
                             <span className="text-xs font-black uppercase tracking-widest text-white/60">姓名</span>
                             <input 
                                value={editingCustomer.name} 
                                onChange={e => setEditingCustomer({...editingCustomer, name: e.target.value})}
                                className="bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-white font-bold w-40 focus:outline-none focus:bg-white/20"
                                placeholder="客戶姓名"
                             />
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="bg-white/20 px-3 py-1 rounded-lg text-lg font-black backdrop-blur-sm border border-white/10">
                              {getCategoryIcon(editingCustomer.productCategory)} #{editingCustomer.customerId}
                            </span>
                            <h1 className="text-4xl font-black tracking-tight">{editingCustomer.company}</h1>
                        </div>
                        <div className="flex items-center space-x-3">
                        <span className="text-xl font-bold text-white/80">{editingCustomer.name}</span>
                        <div className="bg-indigo-400/30 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border border-white/10">道騰核心資料庫同步中</div>
                        </div>
                    </>
                )}
              </div>
            </div>
            <button onClick={onClose} className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all border border-white/10 flex-shrink-0">✕</button>
          </div>

          <div className="flex space-x-3 mt-10 overflow-x-auto no-scrollbar pb-2">
            {statsItems.map(item => (
              <div key={item.id} className={`${item.color} p-5 min-w-[160px] rounded-[32px] shadow-lg border border-white/10 relative overflow-hidden group`}>
                <div className="relative z-10">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-80">{item.label}</span>
                    <span className="text-xl">{item.icon}</span>
                  </div>
                  <div className="text-3xl font-black">{item.count} <span className="text-[10px] opacity-60 font-medium">ITEMS</span></div>
                  {item.fee !== undefined && (
                    <div className="mt-2 text-[9px] font-black bg-black/20 py-1 px-2 rounded-lg">
                      本月累計費用: ${item.fee}
                      <div className="text-[7px] opacity-60 font-bold uppercase mt-0.5">1號自動重置計數</div>
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 text-6xl opacity-10 grayscale group-hover:rotate-12 transition-transform">{item.icon}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row relative">
          {isEditLocked && (
            <div className="absolute top-4 right-8 z-20 flex flex-col items-end gap-2">
               <button onClick={() => setShowPwdModal('UNLOCK_EDIT')} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-2"><span>🔓</span> 解鎖編輯</button>
            </div>
          )}

          <div className={`w-full lg:w-[320px] bg-white border-r border-gray-100 p-8 space-y-8 overflow-y-auto custom-scrollbar flex flex-col transition-all duration-500`}>
             <div className={`space-y-6 ${isEditLocked ? 'grayscale opacity-60' : ''}`}>
                <div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex justify-between"><span>⭐ 客戶分層</span><span className="text-rose-400">{isEditLocked ? 'LOCKED' : 'UNLOCKED'}</span></h3>
                  <div className="flex gap-2">
                    {TAG_OPTIONS.map(tag => (
                      <button 
                        key={tag} 
                        disabled={isEditLocked} 
                        onClick={() => {
                            const tags = editingCustomer.tags || [];
                            const newTags = tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag];
                            setEditingCustomer({...editingCustomer, tags: newTags});
                        }}
                        className={`flex-1 py-3 rounded-2xl text-[10px] font-black border-2 ${editingCustomer.tags?.includes(tag) ? 'bg-[#3D48B8] border-[#3D48B8] text-white shadow-md' : 'bg-white border-gray-100 text-gray-400'}`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">🏛️ 館別</h3>
                  <div className="flex gap-2">
                    {VENUE_OPTIONS.map(opt => (
                      <button 
                        key={opt} 
                        disabled={isEditLocked}
                        onClick={() => setEditingCustomer({...editingCustomer, venue: opt})}
                        className={`flex-1 py-3 rounded-2xl text-[10px] font-black border-2 ${editingCustomer.venue === opt ? 'bg-[#3D48B8] border-[#3D48B8] text-white shadow-md' : 'bg-white border-gray-100 text-gray-400'}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">🏢 產品類別</h3>
                  <div className="flex gap-2">
                    {PRODUCT_CATEGORY_OPTIONS.map(opt => (
                      <button 
                        key={opt} 
                        disabled={isEditLocked}
                        onClick={() => setEditingCustomer({...editingCustomer, productCategory: opt})}
                        className={`flex-1 py-3 rounded-2xl text-[10px] font-black border-2 ${editingCustomer.productCategory === opt ? 'bg-[#3D48B8] border-[#3D48B8] text-white shadow-md' : 'bg-white border-gray-100 text-gray-400'}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">📍 偏好樓層</h3>
                  {!isEditLocked ? (
                      <input 
                        value={editingCustomer.preferredFloor || ''}
                        onChange={e => setEditingCustomer({...editingCustomer, preferredFloor: e.target.value})}
                        className="w-full p-3 bg-gray-50 rounded-xl text-xs font-bold border border-gray-100 focus:outline-none focus:border-indigo-300"
                        placeholder="例如：21樓櫃檯"
                      />
                  ) : (
                      <p className="text-xs font-black text-gray-700">{editingCustomer.preferredFloor || '未設定'}</p>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-50">
                  <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-4">🎁 會員專屬額度與費用</h3>
                  <div className={`grid grid-cols-2 gap-3 ${isEditLocked ? 'opacity-80' : ''}`}>
                     <div className="space-y-1">
                        <p className="text-[8px] font-black text-gray-400 uppercase">每月免費掃描次數</p>
                        {isEditLocked ? (
                            <div className="bg-gray-50 px-3 py-2 rounded-xl text-xs font-bold">{editingCustomer.freeScans || 0} 次</div>
                        ) : (
                            <input 
                                type="number"
                                placeholder="0"
                                value={editingCustomer.freeScans ?? ''}
                                onChange={e => setEditingCustomer({...editingCustomer, freeScans: e.target.value === '' ? undefined : Number(e.target.value)})}
                                className="w-full bg-white border border-indigo-200 px-3 py-2 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        )}
                     </div>
                     <div className="space-y-1">
                        <p className="text-[8px] font-black text-gray-400 uppercase">超額掃描費用</p>
                        {isEditLocked ? (
                            <div className="bg-gray-50 px-3 py-2 rounded-xl text-xs font-bold">${editingCustomer.scanFee || 0}</div>
                        ) : (
                             <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">$</span>
                                <input 
                                    type="number"
                                    placeholder="0"
                                    value={editingCustomer.scanFee ?? ''}
                                    onChange={e => setEditingCustomer({...editingCustomer, scanFee: e.target.value === '' ? undefined : Number(e.target.value)})}
                                    className="w-full bg-white border border-indigo-200 pl-6 pr-3 py-2 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        )}
                     </div>
                     <div className="space-y-1">
                        <p className="text-[8px] font-black text-gray-400 uppercase">每月免費寄送次數</p>
                         {isEditLocked ? (
                            <div className="bg-gray-50 px-3 py-2 rounded-xl text-xs font-bold">{editingCustomer.freeDeliveries || 0} 次</div>
                        ) : (
                            <input 
                                type="number"
                                placeholder="0"
                                value={editingCustomer.freeDeliveries ?? ''}
                                onChange={e => setEditingCustomer({...editingCustomer, freeDeliveries: e.target.value === '' ? undefined : Number(e.target.value)})}
                                className="w-full bg-white border border-indigo-200 px-3 py-2 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        )}
                     </div>
                     <div className="space-y-1">
                        <p className="text-[8px] font-black text-gray-400 uppercase">超額寄送費用</p>
                        {isEditLocked ? (
                            <div className="bg-gray-50 px-3 py-2 rounded-xl text-xs font-bold">${editingCustomer.deliveryFee || 0}</div>
                        ) : (
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">$</span>
                                <input 
                                    type="number"
                                    placeholder="0"
                                    value={editingCustomer.deliveryFee ?? ''}
                                    onChange={e => setEditingCustomer({...editingCustomer, deliveryFee: e.target.value === '' ? undefined : Number(e.target.value)})}
                                    className="w-full bg-white border border-indigo-200 pl-6 pr-3 py-2 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        )}
                     </div>
                  </div>
                </div>
             </div>

             <div className="pt-8 border-t border-gray-50 flex flex-col items-center">
                {!isEditLocked && (
                    <button onClick={handleSave} className="w-full py-4 bg-emerald-500 text-white rounded-[24px] text-[12px] font-black uppercase tracking-widest shadow-lg hover:bg-emerald-600 transition-all mb-4">
                        💾 儲存變更
                    </button>
                )}
                <button onClick={() => setShowPwdModal('DELETE_CUSTOMER')} className="w-full py-5 bg-[#FFF1F3] text-[#C01033] rounded-[24px] text-[12px] font-black uppercase tracking-widest border border-rose-100 shadow-sm flex items-center justify-center space-x-3 hover:bg-rose-600 hover:text-white transition-all"><span>🗑️</span><span>刪除此客戶檔案</span></button>
             </div>
          </div>

          <div className="flex-1 bg-[#F9FAFF] overflow-y-auto p-10 space-y-12 custom-scrollbar">
            <section className="space-y-6">
              <div className="flex items-center space-x-3">
                <div className="w-1.5 h-6 bg-[#3D48B8] rounded-full"></div>
                <h3 className="text-xl font-black text-gray-800 tracking-tight">當前庫存項目 ({activeLogs.length})</h3>
              </div>
              {activeLogs.length === 0 ? (
                <div className="py-12 text-center bg-white/50 rounded-[40px] border-2 border-dashed border-gray-100 opacity-30">
                  <p className="font-black text-xs uppercase tracking-[0.2em] text-gray-400">目前暫無待處分項目</p>
                </div>
              ) : (
                activeLogs.map(log => (
                  <div key={log.id} className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-6 flex flex-col md:flex-row gap-6 animate-in slide-in-from-bottom-4">
                    {log.imageUrl && <img src={log.imageUrl} className="w-full md:w-32 h-32 rounded-[24px] object-cover border-2 border-gray-50" />}
                    <div className="flex-1 space-y-4">
                      <div className="p-5 bg-gray-50 rounded-[24px] text-xs font-bold text-gray-600 whitespace-pre-wrap shadow-inner leading-relaxed">{log.analysis.suggestedReply}</div>
                      <div className="flex justify-end">
                        <button onClick={() => setShowPwdModal(log.id)} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all">確認處置並結案 ➔</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </section>

            <section ref={historyRef} className="space-y-6 pt-10 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center space-x-3">
                    <div className="w-1.5 h-6 bg-gray-400 rounded-full"></div>
                    <h3 className="text-xl font-black text-gray-800 tracking-tight">歷史紀錄中心 ({displayedHistory.length})</h3>
                </div>
                
                {/* 篩選控制器 */}
                <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
                  {[
                    { id: 'all', label: '全部', icon: '📁' },
                    { id: 'processed', label: '已處理', icon: '✅' },
                    { id: 'unprocessed', label: '未處理', icon: '⏳' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setHistoryFilter(tab.id as any)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${historyFilter === tab.id ? 'bg-[#3D48B8] text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
                    >
                      <span>{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 搜尋欄位 */}
              <div className="bg-white px-6 py-4 rounded-3xl border border-gray-100 shadow-sm flex items-center space-x-4">
                <span className="text-xl">🔍</span>
                <input 
                  className="flex-1 bg-transparent border-none outline-none font-bold text-sm text-gray-700 placeholder-gray-300"
                  placeholder="搜尋歷史訊息內容或寄件人..."
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                {displayedHistory.map(log => (
                  <div key={log.id} className={`bg-white rounded-[40px] p-6 border transition-all flex flex-col md:flex-row items-center gap-6 shadow-sm hover:shadow-md ${log.isArchived ? 'border-gray-100' : 'border-indigo-100 bg-indigo-50/10'}`}>
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl shadow-inner ${log.isArchived ? 'bg-gray-50 text-gray-400' : 'bg-indigo-600 text-white'}`}>
                        {log.isArchived ? '✅' : '⏳'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                            {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        {!log.isArchived && <span className="bg-indigo-600 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase">Active</span>}
                        {log.processingStatus && (
                            <span className="bg-gray-100 text-gray-400 px-2 py-0.5 rounded text-[8px] font-black uppercase">{log.processingStatus}</span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-gray-700 mb-1">{log.analysis.summary}</p>
                      <p className="text-[10px] text-gray-400 font-medium italic">寄件者: {log.analysis.senderName || '未知'}</p>
                    </div>
                    {log.imageUrl && (
                        <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                            <img src={log.imageUrl} className="w-full h-full object-cover" />
                        </div>
                    )}
                  </div>
                ))}
                {displayedHistory.length === 0 && (
                  <div className="py-32 text-center bg-white rounded-[40px] border-2 border-dashed border-gray-100 opacity-20">
                     <span className="text-6xl block mb-4">🗄️</span>
                     <p className="font-black text-sm uppercase tracking-[0.5em]">在此篩選條件下無任何紀錄</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
