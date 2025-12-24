
import React, { useState } from 'react';
import { MailLogEntry, MailProcessingStatus } from '../types';

interface UnifiedTaskDashboardProps {
  logs: MailLogEntry[];
  onUpdateLogs: (newLogs: MailLogEntry[]) => void;
  onProcessMail: (logId: string, status: MailProcessingStatus) => void;
}

type DashboardCategory = 'scanned' | 'move_to_1f' | 'at_counter_12' | 'at_counter' | 'scheduled' | 'discarded';

const ADMIN_PASSWORD = 'mail5286';

const UnifiedTaskDashboard: React.FC<UnifiedTaskDashboardProps> = ({ logs, onUpdateLogs, onProcessMail }) => {
  const [activeCategory, setActiveCategory] = useState<DashboardCategory>('scanned');
  const [viewMode, setViewMode] = useState<'active' | 'history'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  
  // 密碼驗證狀態
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [inputPwd, setInputPwd] = useState('');
  const [pwdError, setPwdError] = useState(false);

  // 計算各分類計數 (處理中)
  const getCategoryCount = (cat: DashboardCategory) => {
    return logs.filter(l => l.processingStatus === cat && !l.isArchived).length;
  };

  // 根據類別與模式過濾資料
  const filteredLogs = logs.filter(log => {
    if (log.processingStatus !== activeCategory) return false;
    if (viewMode === 'active') {
      if (log.isArchived) return false;
    } else {
      if (!log.isArchived) return false;
    }
    const searchStr = searchTerm.toLowerCase();
    const customerName = log.analysis.matchedUser?.name || '';
    const company = log.analysis.matchedUser?.company || '';
    const customerId = log.analysis.matchedUser?.customerId || '';
    const sender = log.analysis.senderName || '';

    return (
      customerName.toLowerCase().includes(searchStr) ||
      company.toLowerCase().includes(searchStr) ||
      customerId.includes(searchStr) ||
      sender.toLowerCase().includes(searchStr)
    );
  });

  const getCategoryInfo = (cat: DashboardCategory) => {
    switch (cat) {
      case 'scanned': return { label: '數位掃描', icon: '📧', title: '數位掃描中心', subTitle: 'SCANNING CENTER', tip: '掃描完成後請勾選項目。結算後資料將歸檔至歷史區。' };
      case 'move_to_1f': return { label: '1F 存放', icon: '🚚', title: '1F 存放中心', subTitle: '1F STORAGE', tip: '已移交至一樓。客戶領取後，請在此執行任務結算歸檔。' };
      case 'at_counter_12': return { label: '12F 櫃台', icon: '🏢', title: '12F 櫃台存放', subTitle: '12F COUNTER', tip: '四維館現場存放項目。處理完畢後請在此結算。' };
      case 'at_counter': return { label: '21F 櫃台', icon: '📍', title: '21F 櫃台存放', subTitle: '21F COUNTER', tip: '現場存放項目。處理完畢後請在此結算。' };
      case 'scheduled': return { label: '月底寄送', icon: '📦', title: '月底寄送池', subTitle: 'DELIVERY POOL', tip: '累積郵件池。月底統一寄出後，請執行批次結算。' };
      case 'discarded': return { label: '碎紙銷毀', icon: '✂️', title: '碎紙銷毀日誌', subTitle: 'DESTRUCTION LOGS', tip: '此為碎紙紀錄區。' };
    }
  };

  const currentInfo = getCategoryInfo(activeCategory);

  const handleToggleCheck = (logId: string) => {
    const updated = logs.map(l => 
      l.id === logId ? { ...l, isNotified: !l.isNotified } : l
    );
    onUpdateLogs(updated);
  };

  const handleSelectAll = () => {
    const allChecked = filteredLogs.every(l => l.isNotified);
    const updated = logs.map(l => {
      if (filteredLogs.some(fl => fl.id === l.id)) {
        return { ...l, isNotified: !allChecked };
      }
      return l;
    });
    onUpdateLogs(updated);
  };

  const startBatchClear = () => {
    const checkedCount = filteredLogs.filter(l => l.isNotified).length;
    if (checkedCount === 0) return alert('請先勾選已完成的項目');
    setShowPwdModal(true);
  };

  const confirmBatchClear = () => {
    if (inputPwd === ADMIN_PASSWORD) {
      const checkedLogs = filteredLogs.filter(l => l.isNotified);
      const now = new Date().toISOString();
      const updated = logs.map(l => {
        if (checkedLogs.some(cl => cl.id === l.id)) {
          return { ...l, isArchived: true, isNotified: false, processedAt: now };
        }
        return l;
      });
      onUpdateLogs(updated);
      setShowPwdModal(false);
      setInputPwd('');
      setPwdError(false);
    } else {
      setPwdError(true);
      setTimeout(() => setPwdError(false), 500);
    }
  };

  const handleDeletePermanent = (logId: string) => {
    if (confirm('確定要永久刪除此筆紀錄嗎？此動作無法復原。')) {
      onUpdateLogs(logs.filter(l => l.id !== logId));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24 relative">
      
      {/* 密碼驗證彈窗 */}
      {showPwdModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className={`bg-white rounded-[40px] p-10 w-full max-w-sm shadow-2xl transition-transform ${pwdError ? 'animate-bounce' : ''}`}>
              <div className="text-4xl mb-6 text-center">🔐</div>
              <h3 className="text-xl font-black text-center mb-2">管理員安全驗證</h3>
              <p className="text-xs text-gray-400 text-center mb-8 font-bold uppercase tracking-widest">請輸入結算密碼以轉移至歷史區</p>
              
              <div className="space-y-4">
                <input 
                  type="password"
                  autoFocus
                  className={`w-full p-5 bg-gray-50 rounded-[24px] border-2 text-center text-lg font-black tracking-[0.5em] focus:bg-white outline-none transition-all ${pwdError ? 'border-red-400' : 'border-transparent focus:border-indigo-500'}`}
                  placeholder="••••••••"
                  value={inputPwd}
                  onChange={e => setInputPwd(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && confirmBatchClear()}
                />
                {pwdError && <p className="text-[10px] text-red-500 font-black text-center animate-pulse">密碼錯誤，請重新輸入</p>}
                
                <div className="flex gap-3 pt-4">
                  <button onClick={() => { setShowPwdModal(false); setInputPwd(''); }} className="flex-1 py-4 bg-gray-100 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest">取消</button>
                  <button onClick={confirmBatchClear} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100">驗證結算</button>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* 頂部類別按鈕與計數 (對應截圖頂部) */}
      <div className="flex space-x-3 overflow-x-auto pb-4 custom-scrollbar no-scrollbar">
        {(['scanned', 'move_to_1f', 'at_counter_12', 'at_counter', 'scheduled', 'discarded'] as DashboardCategory[]).map(cat => {
          const info = getCategoryInfo(cat);
          const count = getCategoryCount(cat);
          return (
            <button
              key={cat}
              onClick={() => { setActiveCategory(cat); setViewMode('active'); }}
              className={`flex-shrink-0 min-w-[140px] px-6 py-4 rounded-[30px] shadow-sm transition-all border-2 flex items-center justify-between group ${activeCategory === cat ? 'bg-indigo-600 border-indigo-600 text-white shadow-indigo-200 shadow-xl' : 'bg-white border-white text-gray-400 hover:border-indigo-100'}`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-xl group-hover:scale-110 transition-transform">{info.icon}</span>
                <span className="text-[11px] font-black tracking-tight whitespace-nowrap">{info.label}</span>
              </div>
              <div className={`ml-2 w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-black ${activeCategory === cat ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-400'}`}>
                {count}
              </div>
            </button>
          );
        })}
      </div>

      {/* 中間主看板區 (對應截圖圓角大方框) */}
      <div className="bg-gray-100/50 p-6 sm:p-12 rounded-[60px] relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
          
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 bg-white/80 rounded-full flex items-center justify-center text-4xl shadow-md border-4 border-white">
              {currentInfo.icon}
            </div>
            <div>
              <h2 className="text-3xl font-black text-gray-800 tracking-tight">{currentInfo.title}</h2>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.1em]">{currentInfo.subTitle} / PROCESSING</span>
              </div>
            </div>
          </div>

          <div className="flex items-center bg-gray-200/50 p-2 rounded-[30px]">
             <button 
              onClick={() => setViewMode('active')} 
              className={`px-8 py-3.5 text-[11px] font-black rounded-[25px] transition-all ${viewMode === 'active' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-400'}`}
             >
               處理中
             </button>
             <button 
              onClick={() => setViewMode('history')} 
              className={`px-8 py-3.5 text-[11px] font-black rounded-[25px] transition-all ${viewMode === 'history' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-400'}`}
             >
               歷史紀錄
             </button>
          </div>

          <div className="relative group">
            {viewMode === 'active' && activeCategory !== 'discarded' && (
              <button 
                onClick={startBatchClear}
                className="relative overflow-hidden w-28 h-40 bg-indigo-100/30 rounded-[35px] border-4 border-indigo-200/50 p-3 flex flex-col items-center justify-center hover:bg-indigo-600 hover:border-indigo-400 group/btn transition-all duration-500 shadow-xl shadow-indigo-100"
              >
                <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center text-white mb-3 group-hover/btn:bg-white group-hover/btn:text-indigo-600 transition-colors">
                  <span className="text-xl">✅</span>
                </div>
                <span className="text-[11px] font-black text-indigo-600 group-hover/btn:text-white leading-tight text-center uppercase tracking-tighter">
                  任務結算<br/>(驗證)
                </span>
                <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></div>
              </button>
            )}
          </div>

        </div>
      </div>

      {/* 搜尋與表格區 */}
      <div className="bg-white rounded-[50px] shadow-2xl shadow-indigo-100/50 overflow-hidden border border-gray-50">
        <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
          <div className="flex-1 w-full bg-gray-50 px-6 py-4 rounded-[25px] flex items-center space-x-4 border border-gray-100 focus-within:bg-white focus-within:border-indigo-100 transition-all shadow-inner">
            <span className="text-2xl grayscale opacity-50 group-focus-within:grayscale-0">🔍</span>
            <input 
              className="bg-transparent border-none outline-none w-full font-bold text-sm text-gray-700 placeholder-gray-300"
              placeholder="搜尋編號、姓名、公司或寄件人..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          {viewMode === 'active' && filteredLogs.length > 0 && (
            <button 
              onClick={handleSelectAll} 
              className="whitespace-nowrap px-8 py-4 text-[10px] font-black text-indigo-500 bg-indigo-50 rounded-[20px] hover:bg-indigo-600 hover:text-white transition-all uppercase tracking-[0.1em]"
            >
              {filteredLogs.every(l => l.isNotified) ? '取消全選' : '全選項目'}
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/30 border-b border-gray-50">
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">結算勾選</th>
                <th className="px-6 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">取信編號 / 客戶單位</th>
                <th className="px-6 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">寄件單位</th>
                <th className="px-6 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">轉移時間</th>
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredLogs.map(log => (
                <tr key={log.id} className={`hover:bg-indigo-50/20 transition-all duration-300 ${log.isNotified ? 'bg-indigo-50/30' : ''}`}>
                  <td className="px-10 py-6 text-center">
                    {viewMode === 'active' ? (
                      <div className="flex items-center justify-center">
                        <label className="relative flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={log.isNotified}
                            onChange={() => handleToggleCheck(log.id)}
                            className="sr-only peer"
                          />
                          <div className="w-10 h-10 bg-white border-2 border-gray-100 rounded-2xl peer-checked:bg-indigo-600 peer-checked:border-indigo-600 transition-all flex items-center justify-center shadow-sm">
                            <span className={`text-white text-xs ${log.isNotified ? 'opacity-100' : 'opacity-0'} transition-opacity`}>✓</span>
                          </div>
                        </label>
                      </div>
                    ) : (
                      <div className="bg-emerald-50 text-emerald-500 px-4 py-1.5 rounded-full text-[9px] font-black uppercase inline-block border border-emerald-100">ARCHIVED</div>
                    )}
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex flex-col">
                      <div className="flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${log.isNotified ? 'bg-indigo-600 animate-pulse' : 'bg-gray-300'}`}></span>
                        <span className="text-[13px] font-black text-gray-900 leading-tight">
                          #{log.analysis.matchedUser?.customerId || '??'} - {log.analysis.matchedUser?.company || '個人'}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-indigo-400 mt-1 ml-4 uppercase tracking-tighter">
                        {log.analysis.matchedUser?.name || '未知收件人'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="text-[11px] font-black text-gray-600 max-w-[200px] truncate bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 uppercase tracking-tighter">
                      {log.analysis.senderName || '未註明寄件者'}
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex flex-col text-[10px] font-black text-gray-400 tracking-tighter uppercase">
                      <span className="text-gray-500">{new Date(log.timestamp).toLocaleDateString()}</span>
                      <span className="opacity-50 mt-0.5">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </td>
                  <td className="px-10 py-6 text-center">
                    <button 
                      onClick={() => handleDeletePermanent(log.id)}
                      className="w-12 h-12 flex items-center justify-center rounded-2xl bg-gray-50 text-gray-300 hover:text-red-500 hover:bg-red-50 hover:shadow-md transition-all mx-auto border border-transparent hover:border-red-100"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-40 text-center">
                    <div className="flex flex-col items-center justify-center">
                       <div className="w-24 h-24 bg-gray-50/50 rounded-full flex items-center justify-center mb-6 border border-gray-100">
                         <span className="text-5xl opacity-10 grayscale">📂</span>
                       </div>
                       <p className="text-[11px] font-black text-gray-300 uppercase tracking-[0.4em]">目前此類別暫無紀錄</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
};

export default UnifiedTaskDashboard;
