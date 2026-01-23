
import React, { useState, useRef } from 'react';
import { MatchedUser, MailLogEntry, ScheduledMail } from '../types';
import { APP_VERSION } from '../constants';

interface SystemSettingsModalProps {
  onClose: () => void;
  customers: MatchedUser[];
  mailLogs: MailLogEntry[];
  scheduledMails: ScheduledMail[];
  currentVenue: any;
  viewMode: string;
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
  onRestore
}) => {
  const [activeTab, setActiveTab] = useState<'backup' | 'cloud' | 'about'>('backup');
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [pwdError, setPwdError] = useState(false);
  
  const [restoreStage, setRestoreStage] = useState<'idle' | 'analyzing' | 'review'>('idle');
  const [analyzedData, setAnalyzedData] = useState<SmartBackupData | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreOptions, setRestoreOptions] = useState({
    customers: true,
    logs: true,
    config: true
  });

  const [cloudConfig, setCloudConfig] = useState({
    endpoint: localStorage.getItem('CLOUD_SYNC_ENDPOINT') || '',
    apiKey: localStorage.getItem('CLOUD_SYNC_KEY') || '',
    isEnabled: localStorage.getItem('CLOUD_SYNC_ENABLED') === 'true'
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleVerify = () => {
    if (password === ADMIN_PASSWORD) {
      setIsAuthorized(true);
      setPwdError(false);
    } else {
      setPwdError(true);
      setTimeout(() => setPwdError(false), 500);
    }
  };

  const handleSaveCloudConfig = () => {
    localStorage.setItem('CLOUD_SYNC_ENDPOINT', cloudConfig.endpoint);
    localStorage.setItem('CLOUD_SYNC_KEY', cloudConfig.apiKey);
    localStorage.setItem('CLOUD_SYNC_ENABLED', String(cloudConfig.isEnabled));
    alert('✅ 雲端同步設定已更新（預備連線中）');
  };

  const executeSmartBackup = () => {
    const backupData: SmartBackupData = {
      meta: {
        systemVersion: APP_VERSION,
        createdAt: new Date().toISOString(),
        createdBy: 'Admin',
        sourceVenue: currentVenue.name,
        dataCounts: {
          customers: customers.length,
          logs: mailLogs.length
        }
      },
      payload: {
        appConfig: { venue: currentVenue, mode: viewMode },
        customers: customers,
        mailLogs: mailLogs
      }
    };

    const fileName = `DT_SMART_BACKUP_${new Date().toISOString().slice(0,10).replace(/-/g,'')}_${currentVenue.name}.json`;
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    alert('✅ 備份成功！');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreStage('analyzing');
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonString = event.target?.result as string;
        setTimeout(() => {
          try {
            const rawData = JSON.parse(jsonString);
            let validData: SmartBackupData;
            if (rawData.meta && rawData.payload) {
              validData = rawData;
            } else {
              validData = {
                meta: {
                  systemVersion: 'Legacy',
                  createdAt: new Date().toISOString(),
                  createdBy: 'Legacy',
                  sourceVenue: 'Unknown',
                  dataCounts: { customers: rawData.customers?.length || 0, logs: rawData.mailLogs?.length || 0 }
                },
                payload: { appConfig: { venue: currentVenue, mode: viewMode }, customers: rawData.customers || [], mailLogs: rawData.mailLogs || [] }
              };
            }
            setAnalyzedData(validData);
            setRestoreStage('review');
          } catch (err) {
            alert("❌ 檔案錯誤");
            setRestoreStage('idle');
          }
        }, 800);
      } catch (err) {
        setRestoreStage('idle');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmRestore = async () => {
    if (!analyzedData) return;
    setIsRestoring(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    onRestore({
      restoreCustomers: restoreOptions.customers,
      restoreLogs: restoreOptions.logs,
      restoreConfig: restoreOptions.config,
      data: analyzedData.payload
    });
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
      <div className="bg-[#F8F9FE] w-full max-w-2xl rounded-[48px] shadow-2xl overflow-hidden flex flex-col border border-white/30 animate-in zoom-in-95 max-h-[90vh]">
        <div className="bg-indigo-600 p-8 pb-4 text-white relative flex-shrink-0">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-black tracking-tight">系統設定中心</h2>
              <p className="text-[10px] font-black opacity-70 uppercase tracking-widest mt-1">System Core Control</p>
            </div>
            <button onClick={onClose} className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all">✕</button>
          </div>
          <div className="flex gap-1 bg-black/20 p-1 rounded-2xl border border-white/10">
            <button onClick={() => setActiveTab('backup')} className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${activeTab === 'backup' ? 'bg-white text-indigo-600' : 'text-white/60'}`}>資料備份/還原</button>
            <button onClick={() => setActiveTab('cloud')} className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${activeTab === 'cloud' ? 'bg-white text-indigo-600' : 'text-white/60'}`}>雲端連線(API)</button>
            <button onClick={() => setActiveTab('about')} className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${activeTab === 'about' ? 'bg-white text-indigo-600' : 'text-white/60'}`}>關於版本</button>
          </div>
        </div>

        <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
          {activeTab === 'backup' && (
            <div className="space-y-6">
              {restoreStage === 'idle' && (
                <div className="space-y-6">
                   <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-gray-800">本地數據狀態 (Local-First)</h4>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button onClick={executeSmartBackup} className="p-6 bg-indigo-50 rounded-[35px] border-2 border-indigo-100 flex flex-col items-center space-y-3 group">
                      <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center text-2xl shadow-lg">💾</div>
                      <span className="font-black text-sm text-indigo-900">匯出本地備份</span>
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="p-6 bg-white rounded-[35px] border-2 border-dashed border-gray-200 flex flex-col items-center space-y-3 hover:border-emerald-400 hover:bg-emerald-50 transition-all">
                      <div className="w-14 h-14 bg-gray-100 text-gray-400 rounded-2xl flex items-center justify-center text-2xl">🔄</div>
                      <span className="font-black text-sm text-gray-800">匯入備份還原</span>
                    </button>
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".json" className="hidden" />
                </div>
              )}
              {restoreStage === 'review' && analyzedData && (
                <div className="space-y-4 animate-in slide-in-from-right-4">
                  <div className="bg-white p-6 rounded-[32px] border border-gray-200 space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                      <span className="text-[10px] font-black text-emerald-500 uppercase">備份檔分析完成</span>
                      <span className="text-[10px] font-black text-gray-400">{analyzedData.meta.sourceVenue} / {analyzedData.meta.systemVersion}</span>
                    </div>
                    <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl cursor-pointer">
                      <input type="checkbox" checked={restoreOptions.customers} onChange={() => setRestoreOptions(p => ({...p, customers: !p.customers}))} className="w-5 h-5 accent-indigo-600" />
                      <span className="text-xs font-bold text-gray-700">還原客戶資料 ({analyzedData.meta.dataCounts.customers})</span>
                    </label>
                    <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl cursor-pointer">
                      <input type="checkbox" checked={restoreOptions.logs} onChange={() => setRestoreOptions(p => ({...p, logs: !p.logs}))} className="w-5 h-5 accent-indigo-600" />
                      <span className="text-xs font-bold text-gray-700">還原郵務日誌 ({analyzedData.meta.dataCounts.logs})</span>
                    </label>
                    <button onClick={handleConfirmRestore} disabled={isRestoring} className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-sm mt-4 shadow-xl">
                      {isRestoring ? '執行還原中...' : '確認執行還原'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'cloud' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-amber-50 p-6 rounded-[32px] border border-amber-100">
                 <h4 className="text-amber-800 font-black text-sm flex items-center gap-2 mb-2"><span>🚀</span> 雲端資料庫串接預備 (Beta)</h4>
                 <p className="text-[11px] text-amber-700 leading-relaxed font-bold">
                   若您已建置後端 API (如 Node.js, Python) 與資料庫，請在此輸入端點資訊。啟動後系統將切換為「即時同步模式」。
                 </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">API Endpoint URL</label>
                   <input 
                    placeholder="https://api.your-system.com/v1"
                    className="w-full p-5 bg-white rounded-[24px] border border-gray-100 shadow-inner font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={cloudConfig.endpoint}
                    onChange={e => setCloudConfig({...cloudConfig, endpoint: e.target.value})}
                   />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Authorized API Key</label>
                   <input 
                    type="password"
                    placeholder="••••••••••••••••"
                    className="w-full p-5 bg-white rounded-[24px] border border-gray-100 shadow-inner font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={cloudConfig.apiKey}
                    onChange={e => setCloudConfig({...cloudConfig, apiKey: e.target.value})}
                   />
                </div>
                <label className="flex items-center justify-between p-6 bg-white border border-gray-100 rounded-[32px] cursor-pointer">
                   <span className="font-black text-sm text-gray-800">啟用即時雲端同步</span>
                   <div className="relative inline-block w-12 h-6">
                      <input type="checkbox" className="sr-only peer" checked={cloudConfig.isEnabled} onChange={e => setCloudConfig({...cloudConfig, isEnabled: e.target.checked})} />
                      <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                   </div>
                </label>
                <button onClick={handleSaveCloudConfig} className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-sm shadow-xl mt-4">儲存串接設定</button>
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="space-y-6 text-center py-10 animate-in fade-in">
               <div className="w-20 h-20 bg-indigo-600 rounded-[30px] flex items-center justify-center text-white text-3xl mx-auto shadow-2xl mb-6">✉️</div>
               <div>
                  <h3 className="text-xl font-black text-gray-800">道騰 AI 郵務管理系統</h3>
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">Version {APP_VERSION}</p>
               </div>
               <div className="p-6 bg-white rounded-[32px] border border-gray-100 text-left space-y-3">
                  <p className="text-[11px] font-bold text-gray-500 leading-relaxed">
                    本系統為道騰國際共享空間專屬。目前已升級為 IndexedDB 高容量儲存架構，支援數千筆圖檔資料與智慧分析。
                  </p>
                  <p className="text-[11px] font-bold text-gray-500">© 2025 Dao Teng International. All rights reserved.</p>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemSettingsModal;
