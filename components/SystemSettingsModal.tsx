
import React, { useState, useRef } from 'react';
import { MatchedUser, MailLogEntry, ScheduledMail, MailTemplate } from '../types';
import { APP_VERSION } from '../constants';

interface SystemSettingsModalProps {
  onClose: () => void;
  customers: MatchedUser[];
  mailLogs: MailLogEntry[];
  scheduledMails: ScheduledMail[];
  currentVenue: any;
  viewMode: string;
  templates: MailTemplate[];
  onUpdateTemplates: (tpls: MailTemplate[]) => void;
  onRestore: (data: RestorePayload) => void;
}

export interface SmartBackupData {
  meta: {
    systemVersion: string;
    createdAt: string;
    createdBy: string;
    sourceVenue: string;
    dataCounts: {
      customers: number;
      logs: number;
    };
  };
  payload: {
    appConfig: {
      venue: any;
      mode: string;
    };
    customers: MatchedUser[];
    mailLogs: MailLogEntry[];
  };
}

export interface RestorePayload {
  restoreCustomers: boolean;
  restoreLogs: boolean;
  restoreConfig: boolean;
  data: SmartBackupData['payload'];
}

const ADMIN_PASSWORD = 'mail5286';

const SystemSettingsModal: React.FC<SystemSettingsModalProps> = ({
  onClose,
  customers,
  mailLogs,
  currentVenue,
  viewMode,
  templates,
  onUpdateTemplates,
  onRestore
}) => {
  const [activeTab, setActiveTab] = useState<'backup' | 'templates' | 'about'>('backup');
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [pwdError, setPwdError] = useState(false);
  
  const [editingTemplates, setEditingTemplates] = useState<MailTemplate[]>(templates);
  const [selectedTplId, setSelectedTplId] = useState<'Basic' | 'MVP' | 'VIP' | 'Unknown'>('Basic');

  const handleVerify = () => {
    if (password === ADMIN_PASSWORD) {
      setIsAuthorized(true);
      setPwdError(false);
    } else {
      setPwdError(true);
      setTimeout(() => setPwdError(false), 500);
    }
  };

  const handleUpdateTplContent = (content: string) => {
    const updated = editingTemplates.map(t => t.id === selectedTplId ? { ...t, content } : t);
    setEditingTemplates(updated);
  };

  const insertVariable = (variable: string) => {
    const current = editingTemplates.find(t => t.id === selectedTplId)?.content || '';
    handleUpdateTplContent(current + ` {{${variable}}}`);
  };

  const saveTemplates = () => {
    onUpdateTemplates(editingTemplates);
    alert('✅ 通知模板已更新，之後的 AI 辨識將套用新模板。');
  };

  const getPreviewText = () => {
    const tpl = editingTemplates.find(t => t.id === selectedTplId)?.content || '';
    return tpl
      .replace(/{{客戶姓名}}/g, '陳大文')
      .replace(/{{取信編號}}/g, '85')
      .replace(/{{公司名稱}}/g, '道騰國際')
      .replace(/{{放置地點}}/g, '21樓櫃檯')
      .replace(/{{郵件類型}}/g, '重要掛號信件')
      .replace(/{{寄件單位}}/g, '台北市政府');
  };

  if (!isAuthorized) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
        <div className={`bg-white rounded-[40px] p-10 w-full max-w-sm shadow-2xl transition-transform ${pwdError ? 'animate-bounce' : ''}`}>
          <div className="text-4xl mb-6 text-center">🔐</div>
          <h3 className="text-xl font-black text-center mb-1">系統核心設定</h3>
          <p className="text-[10px] text-gray-400 text-center mb-8 font-black uppercase tracking-widest">Administrator Access Only</p>
          <input 
            type="password" autoFocus
            className="w-full p-5 bg-gray-50 rounded-[24px] border-2 text-center text-lg font-black tracking-[0.5em] focus:bg-white outline-none transition-all"
            placeholder="••••" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleVerify()}
          />
          <div className="flex gap-3 pt-6">
            <button onClick={onClose} className="flex-1 py-4 bg-gray-100 text-gray-400 rounded-2xl font-black text-xs uppercase">取消</button>
            <button onClick={handleVerify} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg shadow-indigo-100">驗證</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#F8F9FE] w-full max-w-3xl rounded-[48px] shadow-2xl overflow-hidden flex flex-col border border-white/30 animate-in zoom-in-95 h-[90vh]">
        <div className="bg-indigo-600 p-8 pb-4 text-white relative flex-shrink-0">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-black tracking-tight">系統設定中心</h2>
              <p className="text-[10px] font-black opacity-70 uppercase tracking-widest mt-1">System Core Control</p>
            </div>
            <button onClick={onClose} className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all">✕</button>
          </div>
          <div className="flex gap-1 bg-black/20 p-1 rounded-2xl border border-white/10">
            <button onClick={() => setActiveTab('backup')} className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${activeTab === 'backup' ? 'bg-white text-indigo-600' : 'text-white/60'}`}>資料備份</button>
            <button onClick={() => setActiveTab('templates')} className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${activeTab === 'templates' ? 'bg-white text-indigo-600' : 'text-white/60'}`}>通知模板自訂</button>
            <button onClick={() => setActiveTab('about')} className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${activeTab === 'about' ? 'bg-white text-indigo-600' : 'text-white/60'}`}>版本資訊</button>
          </div>
        </div>

        <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
          {activeTab === 'templates' && (
            <div className="space-y-8 animate-in fade-in">
              <div className="flex gap-2">
                {editingTemplates.map(t => (
                  <button 
                    key={t.id} 
                    onClick={() => setSelectedTplId(t.id)}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all border-2 ${selectedTplId === t.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-gray-100 text-gray-400'}`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-gray-700 uppercase tracking-widest">模板編輯區域</h4>
                    <span className="text-[9px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-black">等級: {selectedTplId}</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-2">
                    {['客戶姓名', '取信編號', '公司名稱', '放置地點', '郵件類型', '寄件單位'].map(v => (
                      <button 
                        key={v}
                        onClick={() => insertVariable(v)}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-indigo-50 text-[10px] font-bold text-gray-600 rounded-lg border border-gray-200 hover:border-indigo-200 transition-all"
                      >
                        + {v}
                      </button>
                    ))}
                  </div>

                  <textarea 
                    className="w-full h-80 p-6 bg-white border border-gray-100 rounded-[32px] text-sm font-bold text-gray-700 shadow-inner outline-none focus:ring-4 focus:ring-indigo-100 transition-all"
                    value={editingTemplates.find(t => t.id === selectedTplId)?.content || ''}
                    onChange={e => handleUpdateTplContent(e.target.value)}
                  />
                  
                  <button onClick={saveTemplates} className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-sm shadow-xl">
                    💾 儲存所有模板設定
                  </button>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-black text-gray-700 uppercase tracking-widest">LINE 視角即時預覽</h4>
                  <div className="bg-[#7494C0] p-6 rounded-[40px] aspect-[9/16] relative overflow-hidden shadow-2xl border-8 border-gray-900">
                    <div className="bg-white/90 p-5 rounded-2xl rounded-tl-none shadow-sm text-xs font-bold text-gray-800 whitespace-pre-wrap leading-relaxed relative animate-in slide-in-from-left-4">
                      <div className="absolute -left-2 top-0 w-4 h-4 bg-white/90 rotate-45"></div>
                      {getPreviewText()}
                    </div>
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-32 h-1 bg-black/20 rounded-full"></div>
                  </div>
                  <p className="text-[9px] text-center text-gray-400 font-bold uppercase tracking-widest">此預覽僅供參考格式與語氣</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-gray-800">本地數據狀態</h4>
                  <p className="text-[10px] text-gray-400 font-bold mt-1 tracking-widest">目前儲存於此瀏覽器 IndexedDB 中</p>
                </div>
                <div className="flex gap-4">
                  <div className="text-center">
                    <span className="block text-xl font-black text-indigo-600">{customers.length}</span>
                    <span className="text-[9px] text-gray-400 font-bold uppercase">客戶</span>
                  </div>
                  <div className="text-center border-l border-gray-100 pl-4">
                    <span className="block text-xl font-black text-indigo-600">{mailLogs.length}</span>
                    <span className="text-[9px] text-gray-400 font-bold uppercase">日誌</span>
                  </div>
                </div>
              </div>
              <button className="w-full py-5 bg-indigo-50 text-indigo-600 rounded-[24px] font-black text-sm border-2 border-indigo-100">匯出完整系統備份</button>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="space-y-6 text-center py-10 animate-in fade-in">
               <div className="w-20 h-20 bg-indigo-600 rounded-[30px] flex items-center justify-center text-white text-3xl mx-auto shadow-2xl mb-6">✉️</div>
               <div>
                  <h3 className="text-xl font-black text-gray-800">道騰 AI 郵務管理系統</h3>
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">Version {APP_VERSION}</p>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemSettingsModal;
