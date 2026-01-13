
import React, { useState } from 'react';
import { MailLogEntry, MailProcessingStatus } from '../types';

interface UnifiedTaskDashboardProps {
  logs: MailLogEntry[];
  onUpdateLogs: (newLogs: MailLogEntry[]) => void;
  onProcessMail: (logId: string, status: MailProcessingStatus) => void;
}

type DashboardCategory = 'scanned' | 'move_to_1f' | 'at_counter' | 'at_counter_12' | 'at_counter_27' | 'scheduled' | 'discarded';

const ADMIN_PASSWORD = 'mail5286';

const UnifiedTaskDashboard: React.FC<UnifiedTaskDashboardProps> = ({ logs, onUpdateLogs }) => {
  const [activeCategory, setActiveCategory] = useState<DashboardCategory>('scanned');
  const [viewMode, setViewMode] = useState<'active' | 'history'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [inputPwd, setInputPwd] = useState('');
  const [pwdError, setPwdError] = useState(false);

  const getCategoryCount = (cat: DashboardCategory) => {
    return logs.filter(l => l.processingStatus === cat && !l.isArchived).length;
  };

  const getCategoryInfo = (cat: DashboardCategory) => {
    switch (cat) {
      case 'scanned': return { label: '數位掃描', icon: '📧', title: '數位掃描中心', subTitle: 'SCANNING CENTER' };
      case 'move_to_1f': return { label: '1F 轉交', icon: '🚚', title: '1F 轉交中心', subTitle: '1F DELIVERY' };
      case 'at_counter': return { label: '21F 櫃台', icon: '📍', title: '21F 櫃台存放', subTitle: '21F COUNTER' };
      case 'at_counter_12': return { label: '12F 櫃台', icon: '🏢', title: '12F 櫃台存放', subTitle: '12F COUNTER' };
      case 'at_counter_27': return { label: '27F 櫃台', icon: '🏢', title: '27F 櫃台存放', subTitle: '27F COUNTER' };
      case 'scheduled': return { label: '月底寄送', icon: '📦', title: '月底寄送池', subTitle: 'MONTHLY POOL' };
      case 'discarded': return { label: '碎紙銷毀', icon: '✂️', title: '碎紙銷毀日誌', subTitle: 'DESTRUCTION LOGS' };
    }
  };

  const currentInfo = getCategoryInfo(activeCategory);

  const filteredLogs = logs.filter(log => {
    if (log.processingStatus !== activeCategory) return false;
    if (viewMode === 'active' && log.isArchived) return false;
    if (viewMode === 'history' && !log.isArchived) return false;
    const searchStr = searchTerm.toLowerCase();
    return (
      (log.analysis.matchedUser?.name || '').toLowerCase().includes(searchStr) ||
      (log.analysis.matchedUser?.company || '').toLowerCase().includes(searchStr) ||
      (log.analysis.matchedUser?.customerId || '').includes(searchStr)
    );
  });

  const confirmBatchClear = () => {
    if (inputPwd === ADMIN_PASSWORD) {
      const now = new Date().toISOString();
      const updated = logs.map(l => {
        if (l.processingStatus === activeCategory && l.isNotified && !l.isArchived) {
          return { ...l, isArchived: true, isNotified: false, processedAt: now };
        }
        return l;
      });
      onUpdateLogs(updated);
      setShowPwdModal(false);
      setInputPwd('');
    } else {
      setPwdError(true);
      setTimeout(() => setPwdError(false), 500);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24 relative">
      {showPwdModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in">
           <div className={`bg-white rounded-[40px] p-10 w-full max-w-sm shadow-2xl ${pwdError ? 'animate-bounce' : ''}`}>
              <h3 className="text-xl font-black text-center mb-8 text-gray-900">管理員授權結案</h3>
              <input type="password" autoFocus className="w-full p-5 bg-gray-50 rounded-[24px] text-center text-lg font-black tracking-[0.5em] outline-none shadow-inner" value={inputPwd} onChange={e => setInputPwd(e.target.value)} onKeyDown={e => e.key === 'Enter' && confirmBatchClear()} />
              <div className="flex gap-3 pt-6">
                <button onClick={() => setShowPwdModal(false)} className="flex-1 py-4 bg-gray-100 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest">取消</button>
                <button onClick={confirmBatchClear} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg shadow-indigo-100">驗證結算</button>
              </div>
           </div>
        </div>
      )}

      <div className="flex space-x-3 overflow-x-auto pb-4 no-scrollbar">
        {(['scanned', 'move_to_1f', 'at_counter', 'at_counter_12', 'at_counter_27', 'scheduled', 'discarded'] as DashboardCategory[]).map(cat => {
          const info = getCategoryInfo(cat);
          return (
            <button key={cat} onClick={() => setActiveCategory(cat)} className={`flex-shrink-0 min-w-[140px] px-6 py-4 rounded-[30px] border-2 flex items-center justify-between group transition-all duration-300 ${activeCategory === cat ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-white border-white text-gray-400 hover:border-indigo-50'}`}>
              <div className="flex items-center space-x-3">
                <span className="text-xl group-hover:scale-110 transition-transform">{info.icon}</span>
                <span className="text-[11px] font-black tracking-tight">{info.label}</span>
              </div>
              <div className={`w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-black ${activeCategory === cat ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-400'}`}>{getCategoryCount(cat)}</div>
            </button>
          );
        })}
      </div>

      <div className="bg-gray-100/50 p-8 sm:p-12 rounded-[60px] relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 bg-white/80 rounded-full flex items-center justify-center text-4xl shadow-md border-4 border-white">{currentInfo.icon}</div>
            <div>
              <h2 className="text-3xl font-black text-gray-800 tracking-tight">{currentInfo.title}</h2>
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">{currentInfo.subTitle} / DT PROCESSING</p>
            </div>
          </div>
          <div className="flex bg-white/60 backdrop-blur p-2 rounded-[30px] shadow-inner">
              <button onClick={() => setViewMode('active')} className={`px-8 py-3.5 text-[11px] font-black rounded-[25px] transition-all ${viewMode === 'active' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}>待處置</button>
              <button onClick={() => setViewMode('history')} className={`px-8 py-3.5 text-[11px] font-black rounded-[25px] transition-all ${viewMode === 'history' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}>歷史紀錄</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[50px] shadow-2xl overflow-hidden border border-gray-50">
        <div className="p-8 flex flex-col sm:flex-row items-center gap-6 border-b border-gray-50">
          <div className="flex-1 w-full bg-gray-50 px-6 py-4 rounded-[25px] flex items-center space-x-4 border border-gray-100 shadow-inner">
            <span className="text-2xl opacity-40">🔍</span>
            <input className="bg-transparent border-none outline-none w-full font-bold text-sm text-gray-700" placeholder="快速搜尋關鍵字..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          {viewMode === 'active' && filteredLogs.some(l => l.isNotified) && (
            <button onClick={() => setShowPwdModal(true)} className="whitespace-nowrap px-10 py-4 bg-indigo-600 text-white rounded-[25px] font-black text-sm shadow-xl shadow-indigo-100 hover:-translate-y-1 active:scale-95 transition-all">確認結算已勾選項目 ➔</button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">結案</th>
                <th className="px-6 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">客戶 / 單位</th>
                <th className="px-6 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">寄件人</th>
                <th className="px-6 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">接收時間</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-indigo-50/20 transition-colors group">
                  <td className="px-8 py-6 text-center">
                    {viewMode === 'active' ? (
                      <input type="checkbox" checked={log.isNotified} onChange={() => {
                        const updated = logs.map(l => l.id === log.id ? { ...l, isNotified: !l.isNotified } : l);
                        onUpdateLogs(updated);
                      }} className="w-7 h-7 rounded-[10px] border-2 border-gray-200 text-indigo-600 focus:ring-indigo-500 cursor-pointer transition-all" />
                    ) : (
                      <div className="bg-emerald-50 text-emerald-500 px-4 py-1.5 rounded-full text-[9px] font-black uppercase inline-block border border-emerald-100">ARCHIVED</div>
                    )}
                  </td>
                  <td className="px-6 py-6">
                    <div className="font-black text-sm text-gray-900 leading-tight">#{log.analysis.matchedUser?.customerId} - {log.analysis.matchedUser?.name}</div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase mt-1 tracking-tighter">{log.analysis.matchedUser?.company}</div>
                  </td>
                  <td className="px-6 py-6"><span className="text-xs font-bold text-gray-600 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">{log.analysis.senderName}</span></td>
                  <td className="px-6 py-6 text-[10px] font-black text-gray-400 uppercase tracking-tighter">{new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredLogs.length === 0 && (
            <div className="py-40 text-center opacity-10">
               <span className="text-8xl block mb-6">📁</span>
               <p className="font-black text-sm uppercase tracking-[0.5em]">目前此分類無任何紀錄</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnifiedTaskDashboard;
