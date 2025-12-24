
import React, { useState, useRef } from 'react';
import { MatchedUser, MailLogEntry, ScheduledMail } from '../types';

interface SystemSettingsModalProps {
  onClose: () => void;
  customers: MatchedUser[];
  mailLogs: MailLogEntry[];
  scheduledMails: ScheduledMail[];
  currentVenue: any;
  viewMode: string;
  onRestore: (data: BackupData) => void;
}

export interface BackupData {
  version: string;
  timestamp: string;
  appConfig: {
    venue: any;
    mode: string;
  };
  customers: MatchedUser[];
  mailLogs: MailLogEntry[];
  scheduledMails: ScheduledMail[];
}

const ADMIN_PASSWORD = 'mail5286';

const SystemSettingsModal: React.FC<SystemSettingsModalProps> = ({
  onClose,
  customers,
  mailLogs,
  scheduledMails,
  currentVenue,
  viewMode,
  onRestore
}) => {
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [pwdError, setPwdError] = useState(false);
  const [pendingAction, setPendingAction] = useState<'backup' | 'restore' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 驗證管理員密碼
  const handleVerify = () => {
    if (password === ADMIN_PASSWORD) {
      if (pendingAction === 'backup') {
        executeBackup();
        setPendingAction(null);
        setPassword('');
      } else if (pendingAction === 'restore') {
        fileInputRef.current?.click();
        setPendingAction(null);
        setPassword('');
      } else {
        setIsAuthorized(true);
        setPwdError(false);
      }
    } else {
      setPwdError(true);
      setTimeout(() => setPwdError(false), 500);
    }
  };

  // 執行備份邏輯
  const executeBackup = () => {
    const backupData: BackupData = {
      version: "V5-COMPLETE-SYSTEM-RESTORE",
      timestamp: new Date().toISOString(),
      appConfig: {
        venue: currentVenue,
        mode: viewMode
      },
      customers,
      mailLogs,
      scheduledMails
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DT_MAIL_SYSTEM_FULL_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
    alert('系統完整備份檔案已成功產生！\n包含：客戶、日誌、任務及系統環境設定。');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string) as BackupData;
        if (data.version.startsWith('V5')) {
          if (confirm('⚠️ 警告：還原將會完全刪除目前系統中的所有數據，並替換為備份檔案中的內容（包含館別設定）。確定要繼續嗎？')) {
            onRestore(data);
            alert('系統已完全還原！網頁即將重啟。');
          }
        } else {
          alert('還原失敗：不支援的備份格式版本。');
        }
      } catch (err) {
        alert('解析備份檔案失敗，請確保選取的是正確的系統備份 JSON。');
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  // 密碼輸入視窗 (用於 Backup, Restore 或 進入選單)
  if (!isAuthorized || pendingAction) {
    const actionLabel = pendingAction === 'backup' ? '執行系統備份' : pendingAction === 'restore' ? '系統還原驗證' : '管理中心登入';
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
        <div className={`bg-white rounded-[40px] p-10 w-full max-w-sm shadow-2xl transition-transform ${pwdError ? 'animate-bounce' : ''}`}>
          <div className="text-4xl mb-6 text-center">🔐</div>
          <h3 className="text-xl font-black text-center mb-1">{actionLabel}</h3>
          <p className="text-[10px] text-gray-400 text-center mb-8 font-black uppercase tracking-widest">Security Authorization Required</p>
          
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
              <button onClick={() => { setPendingAction(null); setPassword(''); setIsAuthorized(false); if(!pendingAction) onClose(); }} className="flex-1 py-4 bg-gray-100 text-gray-400 rounded-2xl font-black text-xs uppercase">返回</button>
              <button onClick={handleVerify} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg shadow-indigo-100">確認授權</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#F8F9FE] w-full max-w-lg rounded-[56px] shadow-2xl overflow-hidden flex flex-col border border-white/30 animate-in zoom-in-95">
        
        <div className="bg-indigo-600 p-10 text-white relative">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black tracking-tight">系統維護中心</h2>
              <p className="text-[10px] font-black opacity-70 uppercase tracking-widest mt-1">Full System State Manager</p>
            </div>
            <button onClick={onClose} className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all">✕</button>
          </div>
        </div>

        <div className="p-10 space-y-8">
          <div className="grid grid-cols-2 gap-6">
            <button 
              onClick={() => setPendingAction('backup')}
              className="p-8 bg-white rounded-[40px] border-2 border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all flex flex-col items-center justify-center space-y-4 group shadow-sm"
            >
              <span className="text-5xl group-hover:scale-110 transition-transform">💾</span>
              <div className="text-center">
                <span className="block text-sm font-black text-gray-800">完整備份</span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Export Config + Data</span>
              </div>
            </button>

            <button 
              onClick={() => setPendingAction('restore')}
              className="p-8 bg-white rounded-[40px] border-2 border-gray-100 hover:border-emerald-200 hover:bg-emerald-50 transition-all flex flex-col items-center justify-center space-y-4 group shadow-sm"
            >
              <span className="text-5xl group-hover:scale-110 transition-transform">🔄</span>
              <div className="text-center">
                <span className="block text-sm font-black text-gray-800">完整還原</span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Import & Overwrite</span>
              </div>
            </button>
          </div>

          <div className="bg-indigo-50 p-6 rounded-[32px] border border-indigo-100">
            <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-3">當前即時數據統計</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-600">🏛️ 當前館別</span>
                <span className="text-[10px] bg-white px-3 py-1 rounded-lg text-indigo-600 font-black shadow-sm">{currentVenue.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-600">📥 儀表板日誌總量</span>
                <span className="text-[10px] bg-white px-3 py-1 rounded-lg text-indigo-600 font-black shadow-sm">{mailLogs.length} 筆</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-600">⏳ 未結案任務</span>
                <span className="text-[10px] bg-rose-50 px-3 py-1 rounded-lg text-rose-500 font-black shadow-sm">{mailLogs.filter(l => !l.isArchived).length} 筆</span>
              </div>
            </div>
          </div>

          <p className="text-[9px] text-gray-400 font-bold text-center italic leading-relaxed px-4">
            備份檔案包含：所有客戶 CRM 資料、所有郵務儀表板紀錄、各項處理狀態標記、以及目前系統的館別偏好設定。
          </p>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".json" 
            className="hidden" 
          />
        </div>

        <div className="bg-gray-50 px-10 py-6 border-t border-gray-100 flex justify-center">
          <button 
            onClick={onClose}
            className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] hover:text-indigo-600 transition-colors"
          >
            ← 返回主頁面
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemSettingsModal;
