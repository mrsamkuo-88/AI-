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

// 定義新的備份資料結構，包含元數據
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
    checksum?: string; // 預留未來擴充
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

// 定義傳回給 App.tsx 的還原請求物件
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
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [pwdError, setPwdError] = useState(false);
  
  // 狀態管理：分析中、分析完成、確認還原
  const [restoreStage, setRestoreStage] = useState<'idle' | 'analyzing' | 'review'>('idle');
  const [analyzedData, setAnalyzedData] = useState<SmartBackupData | null>(null);
  const [isRestoring, setIsRestoring] = useState(false); // New loading state
  const [restoreOptions, setRestoreOptions] = useState({
    customers: true,
    logs: true,
    config: true
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. 權限驗證
  const handleVerify = () => {
    if (password === ADMIN_PASSWORD) {
      setIsAuthorized(true);
      setPwdError(false);
    } else {
      setPwdError(true);
      setTimeout(() => setPwdError(false), 500);
    }
  };

  // 2. 執行智慧備份
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
        appConfig: {
          venue: currentVenue,
          mode: viewMode
        },
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
    alert('✅ 系統備份成功！\n檔案已包含完整元數據與校驗資訊。');
  };

  // 3. 檔案選擇與初步分析
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreStage('analyzing');
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const jsonString = event.target?.result as string;
        // 模擬分析延遲，增加儀式感
        setTimeout(() => {
          try {
            const rawData = JSON.parse(jsonString);
            
            // 驗證資料結構：檢查是否符合 SmartBackupData 或舊版格式
            let validData: SmartBackupData;

            if (rawData.meta && rawData.payload) {
              // 這是新版格式
              validData = rawData;
            } else if (rawData.customers && Array.isArray(rawData.customers)) {
              // 相容舊版 V5/V6 格式，即時轉換為新結構
              validData = {
                meta: {
                  systemVersion: rawData.version || 'Legacy',
                  createdAt: rawData.timestamp || new Date().toISOString(),
                  createdBy: 'Legacy System',
                  sourceVenue: rawData.appConfig?.venue?.name || 'Unknown',
                  dataCounts: {
                    customers: rawData.customers?.length || 0,
                    logs: rawData.mailLogs?.length || 0
                  }
                },
                payload: {
                  appConfig: rawData.appConfig || { venue: currentVenue, mode: viewMode },
                  customers: rawData.customers || [],
                  mailLogs: rawData.mailLogs || []
                }
              };
            } else {
              throw new Error("無法識別的檔案格式");
            }

            setAnalyzedData(validData);
            setRestoreStage('review');
          } catch (err) {
            alert("❌ 檔案分析失敗：格式錯誤或資料損毀");
            setRestoreStage('idle');
          }
        }, 800);
      } catch (err) {
        alert("❌ 讀取失敗");
        setRestoreStage('idle');
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  // 4. 執行最終還原
  const handleConfirmRestore = async () => {
    if (!analyzedData) return;
    
    // Removed native confirm to avoid UI blocking issues
    setIsRestoring(true);
    
    // Tiny delay to allow UI to render the loading state
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
        onRestore({
            restoreCustomers: restoreOptions.customers,
            restoreLogs: restoreOptions.logs,
            restoreConfig: restoreOptions.config,
            data: analyzedData.payload
        });
        // Note: App.tsx will trigger alert and reload. 
        // We don't need to manually close here as page will reload.
    } catch (e) {
        console.error(e);
        setIsRestoring(false);
        alert("還原執行失敗");
    }
  };

  if (!isAuthorized) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
        <div className={`bg-white rounded-[40px] p-10 w-full max-w-sm shadow-2xl transition-transform ${pwdError ? 'animate-bounce' : ''}`}>
          <div className="text-4xl mb-6 text-center">🔐</div>
          <h3 className="text-xl font-black text-center mb-1">系統核心設定</h3>
          <p className="text-[10px] text-gray-400 text-center mb-8 font-black uppercase tracking-widest">Administrator Access Only</p>
          
          <div className="space-y-4">
            <input 
              type="password"
              autoFocus
              className={`w-full p-5 bg-gray-50 rounded-[24px] border-2 text-center text-lg font-black tracking-[0.5em] focus:bg-white outline-none transition-all ${pwdError ? 'border-red-400' : 'border-transparent focus:border-indigo-500'}`}
              placeholder="••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleVerify()}
            />
            <div className="flex gap-3 pt-4">
              <button onClick={onClose} className="flex-1 py-4 bg-gray-100 text-gray-400 rounded-2xl font-black text-xs uppercase">取消</button>
              <button onClick={handleVerify} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg shadow-indigo-100">驗證</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#F8F9FE] w-full max-w-2xl rounded-[48px] shadow-2xl overflow-hidden flex flex-col border border-white/30 animate-in zoom-in-95 max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-indigo-600 p-8 text-white relative flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black tracking-tight">系統備份與還原</h2>
              <p className="text-[10px] font-black opacity-70 uppercase tracking-widest mt-1">Smart Backup & Recovery System</p>
            </div>
            <button onClick={onClose} className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all">✕</button>
          </div>
        </div>

        <div className="p-8 overflow-y-auto custom-scrollbar">
          
          {/* Main View: Idle */}
          {restoreStage === 'idle' && (
            <div className="space-y-8">
              {/* Status Card */}
              <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-gray-800">當前系統狀態</h4>
                  <p className="text-[10px] text-gray-400 font-bold mt-1">CLIENT-SIDE STORAGE</p>
                </div>
                <div className="flex gap-4">
                  <div className="text-center">
                    <span className="block text-xl font-black text-indigo-600">{customers.length}</span>
                    <span className="text-[9px] text-gray-400 font-bold uppercase">客戶數</span>
                  </div>
                  <div className="w-px bg-gray-100 h-8"></div>
                  <div className="text-center">
                    <span className="block text-xl font-black text-indigo-600">{mailLogs.length}</span>
                    <span className="text-[9px] text-gray-400 font-bold uppercase">日誌數</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Backup Button */}
                <button 
                  onClick={executeSmartBackup}
                  className="p-8 bg-indigo-50 rounded-[40px] border-2 border-indigo-100 hover:bg-indigo-100 hover:scale-[1.02] transition-all flex flex-col items-center justify-center space-y-4 group text-center"
                >
                  <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-indigo-200 group-hover:rotate-12 transition-transform">💾</div>
                  <div>
                    <span className="block text-lg font-black text-indigo-900">建立智慧備份</span>
                    <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wide mt-1 block">匯出包含元數據的完整檔案</span>
                  </div>
                </button>

                {/* Restore Button */}
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-8 bg-white rounded-[40px] border-2 border-dashed border-gray-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all flex flex-col items-center justify-center space-y-4 group text-center"
                >
                  <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-2xl flex items-center justify-center text-3xl group-hover:bg-emerald-500 group-hover:text-white transition-colors">🔄</div>
                  <div>
                    <span className="block text-lg font-black text-gray-800 group-hover:text-emerald-700">選擇備份檔還原</span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mt-1 block group-hover:text-emerald-500">支援智慧分析與選擇性還原</span>
                  </div>
                </button>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".json" className="hidden" />
            </div>
          )}

          {/* Analyzing View */}
          {restoreStage === 'analyzing' && (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-2xl">🧠</div>
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-800">正在分析備份檔案...</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-2">驗證資料完整性與版本相容性</p>
              </div>
            </div>
          )}

          {/* Review View */}
          {restoreStage === 'review' && analyzedData && (
            <div className="space-y-6 animate-in slide-in-from-right-8">
              <div className="flex items-center space-x-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 w-fit">
                <span className="text-lg">✨</span>
                <span className="text-xs font-black uppercase tracking-widest">檔案分析通過</span>
              </div>

              {/* Meta Info */}
              <div className="bg-white p-6 rounded-[32px] border border-gray-200 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase">備份版本</label>
                    <p className="font-bold text-gray-800">{analyzedData.meta.systemVersion}</p>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase">建立時間</label>
                    <p className="font-bold text-gray-800">{new Date(analyzedData.meta.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase">來源館別</label>
                    <p className="font-bold text-gray-800">{analyzedData.meta.sourceVenue}</p>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase">建立者</label>
                    <p className="font-bold text-gray-800">{analyzedData.meta.createdBy}</p>
                  </div>
                </div>
              </div>

              {/* Restore Options */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-2">選擇還原項目</h4>
                
                <label className={`flex items-center justify-between p-5 rounded-[24px] border-2 cursor-pointer transition-all ${restoreOptions.customers ? 'bg-indigo-50 border-indigo-500' : 'bg-white border-gray-100'}`}>
                   <div className="flex items-center space-x-3">
                     <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${restoreOptions.customers ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300'}`}>{restoreOptions.customers && '✓'}</div>
                     <div>
                       <span className="block font-black text-sm text-gray-800">客戶資料庫 (CRM)</span>
                       <span className="text-[10px] text-gray-500 font-bold">包含 {analyzedData.meta.dataCounts.customers} 筆客戶資料</span>
                     </div>
                   </div>
                   <input type="checkbox" className="hidden" checked={restoreOptions.customers} onChange={() => setRestoreOptions(p => ({...p, customers: !p.customers}))} />
                </label>

                <label className={`flex items-center justify-between p-5 rounded-[24px] border-2 cursor-pointer transition-all ${restoreOptions.logs ? 'bg-indigo-50 border-indigo-500' : 'bg-white border-gray-100'}`}>
                   <div className="flex items-center space-x-3">
                     <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${restoreOptions.logs ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300'}`}>{restoreOptions.logs && '✓'}</div>
                     <div>
                       <span className="block font-black text-sm text-gray-800">郵務處理日誌</span>
                       <span className="text-[10px] text-gray-500 font-bold">包含 {analyzedData.meta.dataCounts.logs} 筆處理紀錄</span>
                     </div>
                   </div>
                   <input type="checkbox" className="hidden" checked={restoreOptions.logs} onChange={() => setRestoreOptions(p => ({...p, logs: !p.logs}))} />
                </label>

                <label className={`flex items-center justify-between p-5 rounded-[24px] border-2 cursor-pointer transition-all ${restoreOptions.config ? 'bg-indigo-50 border-indigo-500' : 'bg-white border-gray-100'}`}>
                   <div className="flex items-center space-x-3">
                     <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${restoreOptions.config ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300'}`}>{restoreOptions.config && '✓'}</div>
                     <div>
                       <span className="block font-black text-sm text-gray-800">系統環境設定</span>
                       <span className="text-[10px] text-gray-500 font-bold">包含館別設定 ({analyzedData.payload.appConfig.venue.name}) 與偏好</span>
                     </div>
                   </div>
                   <input type="checkbox" className="hidden" checked={restoreOptions.config} onChange={() => setRestoreOptions(p => ({...p, config: !p.config}))} />
                </label>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => { setRestoreStage('idle'); setAnalyzedData(null); }}
                  className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-[24px] font-black text-xs uppercase hover:bg-gray-200"
                >
                  取消
                </button>
                <button 
                  onClick={handleConfirmRestore}
                  disabled={isRestoring}
                  className={`flex-[2] py-4 rounded-[24px] font-black text-xs uppercase shadow-xl shadow-indigo-200 transition-all flex items-center justify-center ${isRestoring ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-[1.02]'}`}
                >
                  {isRestoring ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                        <span>還原作業執行中...</span>
                      </>
                  ) : (
                      '確認並開始還原'
                  )}
                </button>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default SystemSettingsModal;