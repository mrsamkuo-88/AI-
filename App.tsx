import React, { useState, useEffect } from 'react';
import { processImageForMail } from './services/geminiService';
import { GeminiServiceResponse, MatchedUser, MailLogEntry, MailProcessingStatus } from './types';
import ImageUploader from './components/ImageUploader';
import NotificationDisplay from './components/NotificationDisplay';
import CustomerManagement from './components/CustomerManagement';
import UnifiedTaskDashboard from './components/DeliveryManagement';
import CustomerDashboard from './components/CustomerDashboard';
import ManualNotificationModal from './components/ManualNotificationModal';
import SystemSettingsModal, { RestorePayload } from './components/SystemSettingsModal';
import { LIFF_ID, MOCK_CUSTOMER_DB } from './constants';

const DB_KEY = 'AI_MAIL_ASSISTANT_CRM_V5';
const LOG_KEY = 'AI_MAIL_ACTIVITY_LOG_V5';
const VENUE_KEY = 'AI_MAIL_CURRENT_VENUE';
const AUTH_KEY = 'AI_MAIL_SESSION_AUTH';

const LOGIN_PASSWORD = 'mail5286';

const VENUES = [
  { name: '民權館', floor: '21樓櫃檯' },
  { name: '四維館', floor: '12樓櫃檯' }
];

async function optimizeImageForMobile(file: File): Promise<{ base64: string, mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1600;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_DIM) { height *= MAX_DIM / width; width = MAX_DIM; }
        } else {
          if (height > MAX_DIM) { width *= MAX_DIM / height; height = MAX_DIM; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas Failed'));
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => sessionStorage.getItem(AUTH_KEY) === 'true');
  const [loginInput, setLoginInput] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [currentVenue, setCurrentVenue] = useState(() => {
    const saved = localStorage.getItem(VENUE_KEY);
    return saved ? JSON.parse(saved) : VENUES[0];
  });

  const [mailLogs, setMailLogs] = useState<MailLogEntry[]>([]);
  const [customers, setCustomers] = useState<MatchedUser[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });
  const [activeTab, setActiveTab] = useState<'scan' | 'delivery' | 'crm'>('scan');
  const [globalSelectedCustomer, setGlobalSelectedCustomer] = useState<MatchedUser | null>(null);
  const [isManualNotifyOpen, setIsManualNotifyOpen] = useState(false);
  const [isSystemSettingsOpen, setIsSystemSettingsOpen] = useState(false);

  useEffect(() => {
    const savedCrm = localStorage.getItem(DB_KEY);
    setCustomers(savedCrm ? JSON.parse(savedCrm) : MOCK_CUSTOMER_DB);
    const savedLogs = localStorage.getItem(LOG_KEY);
    if (savedLogs) setMailLogs(JSON.parse(savedLogs));
    
    if ((window as any).liff) {
      (window as any).liff.init({ liffId: LIFF_ID }).catch(() => console.warn("LIFF Ready"));
    }
  }, []);

  const handleLogin = () => {
    if (loginInput === LOGIN_PASSWORD) {
      setIsLoggedIn(true);
      sessionStorage.setItem(AUTH_KEY, 'true');
    } else {
      setLoginError(true);
      setLoginInput('');
      setTimeout(() => setLoginError(false), 800);
    }
  };

  const handleImageScan = async (files: File[]) => {
    setIsProcessing(true);
    setProcessingProgress({ current: 0, total: files.length });
    const newEntries: MailLogEntry[] = [];
    
    for (let i = 0; i < files.length; i++) {
      try {
        const { base64, mimeType } = await optimizeImageForMobile(files[i]);
        const result = await processImageForMail(base64, mimeType, currentVenue);
        if (result.analysis) {
          newEntries.push({
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString(),
            analysis: result.analysis,
            imageUrl: `data:${mimeType};base64,${base64}`,
            isNotified: false,
            processingStatus: 'pending',
            isArchived: false
          });
        }
      } catch (e: any) { console.error(e); }
      setProcessingProgress({ current: i + 1, total: files.length });
    }

    if (newEntries.length > 0) {
      const updated = [...newEntries, ...mailLogs];
      setMailLogs(updated);
      localStorage.setItem(LOG_KEY, JSON.stringify(updated));
    }
    setIsProcessing(false);
  };

  const handleSystemRestore = (restorePayload: RestorePayload) => {
    try {
      console.log("Executing Smart Restore...", restorePayload);
      
      const { restoreCustomers, restoreLogs, restoreConfig, data } = restorePayload;
      
      // Update State directly to avoid reload page error
      if (restoreCustomers && Array.isArray(data.customers)) {
        localStorage.setItem(DB_KEY, JSON.stringify(data.customers));
        setCustomers(data.customers);
      }
      
      if (restoreLogs && Array.isArray(data.mailLogs)) {
        localStorage.setItem(LOG_KEY, JSON.stringify(data.mailLogs));
        setMailLogs(data.mailLogs);
      }
      
      if (restoreConfig && data.appConfig && data.appConfig.venue) {
        localStorage.setItem(VENUE_KEY, JSON.stringify(data.appConfig.venue));
        setCurrentVenue(data.appConfig.venue);
      }

      alert("🎉 資料還原成功！已載入最新備份資料。");
      setIsSystemSettingsOpen(false);

    } catch(e: any) {
      console.error("Restore failed", e);
      if (e.name === 'QuotaExceededError' || e.code === 22) {
         alert("錯誤：儲存空間不足 (LocalStorage Quota Exceeded)。無法還原所有資料。");
      } else {
         alert("資料還原過程發生未預期的錯誤：" + e.message);
      }
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#111827] flex items-center justify-center p-6 font-sans">
        <div className={`w-full max-w-md bg-[#1F2937] p-12 rounded-[60px] shadow-2xl border border-white/5 transition-all ${loginError ? 'animate-shake border-red-500' : ''}`}>
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-indigo-600 rounded-[30px] mx-auto flex items-center justify-center text-3xl mb-6 shadow-2xl">🔐</div>
            <h1 className="text-2xl font-black text-white tracking-tight">道騰 AI 郵務管理</h1>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-3">Staff Authorization Portal</p>
          </div>
          <input 
            type="password" autoFocus
            className="w-full py-6 bg-black/20 border-2 border-transparent focus:border-indigo-500 rounded-[30px] text-center text-4xl font-black tracking-[0.5em] text-white outline-none transition-all shadow-inner"
            placeholder="••••" value={loginInput} onChange={e => setLoginInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
          <button onClick={handleLogin} className="w-full py-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[30px] font-black text-lg mt-8 shadow-xl active:scale-95 transition-all">驗證進入</button>
        </div>
      </div>
    );
  }

  const pendingLogs = mailLogs.filter(log => !log.isArchived && (log.processingStatus === 'pending' || log.processingStatus === 'notified'));

  return (
    <div className="flex flex-col min-h-screen w-full max-w-2xl mx-auto bg-[#F0F2F5] shadow-2xl overflow-hidden relative font-sans">
      <header className="bg-[#1E293B] px-6 py-5 flex justify-between items-center sticky top-0 z-50 shadow-xl">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg">✉️</div>
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-white tracking-tight leading-none">道騰 AI 郵務 <span className="text-emerald-400 text-xs ml-1">V6.1.2</span></h1>
            <button onClick={() => setIsSystemSettingsOpen(true)} className="text-[10px] text-gray-400 font-black uppercase tracking-widest hover:text-white transition-colors mt-1.5">{currentVenue.name} ⚙️</button>
          </div>
        </div>
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
          {VENUES.map(v => (
            <button key={v.name} onClick={() => { setCurrentVenue(v); localStorage.setItem(VENUE_KEY, JSON.stringify(v)); }} className={`px-4 py-2 text-[10px] font-black rounded-xl transition-all ${currentVenue.name === v.name ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}>{v.name}</button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-10 pb-44">
        {activeTab === 'scan' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6">
            <ImageUploader onImagesSelect={handleImageScan} onOpenManualNotification={() => setIsManualNotifyOpen(true)} />
            
            {isProcessing && (
              <div className="bg-indigo-600 p-12 rounded-[56px] text-center text-white shadow-3xl border-4 border-indigo-500 animate-in zoom-in">
                <div className="w-16 h-16 border-8 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-8"></div>
                <h3 className="font-black text-2xl mb-2">AI 深度辨識中...</h3>
                <p className="text-white/60 text-xs font-black uppercase tracking-[0.3em]">目前進度：{processingProgress.current} / {processingProgress.total}</p>
              </div>
            )}

            <div className="space-y-8">
              <h3 className="text-2xl font-black text-gray-900 px-4">待處理項目 ({pendingLogs.length})</h3>
              {pendingLogs.map(log => (
                <NotificationDisplay 
                  key={log.id} 
                  analysis={log.analysis} 
                  ocrText="" 
                  imageUrl={log.imageUrl} 
                  allCustomers={customers} 
                  isNotified={log.isNotified} 
                  currentStatus={log.processingStatus} 
                  isArchived={log.isArchived}
                  onDelete={() => {
                    const updated = mailLogs.filter(l => l.id !== log.id);
                    setMailLogs(updated);
                    localStorage.setItem(LOG_KEY, JSON.stringify(updated));
                  }}
                  onMarkAsNotified={(status) => {
                    const updated = mailLogs.map(l => l.id === log.id ? { ...l, processingStatus: status, isNotified: status === 'notified' } : l);
                    setMailLogs(updated);
                    localStorage.setItem(LOG_KEY, JSON.stringify(updated));
                  }}
                  onUpdateMatch={(user) => {
                    const updated = mailLogs.map(l => l.id === log.id ? { 
                      ...l, 
                      analysis: { ...l.analysis, matchedUser: { ...user, status: 'matched' as const } } 
                    } : l);
                    setMailLogs(updated);
                    localStorage.setItem(LOG_KEY, JSON.stringify(updated));
                  }}
                  onOpenDashboard={setGlobalSelectedCustomer}
                />
              ))}
              {pendingLogs.length === 0 && !isProcessing && (
                <div className="py-24 text-center opacity-20 grayscale">
                  <span className="text-8xl block mb-6">📭</span>
                  <p className="font-black text-sm uppercase tracking-[0.5em]">目前暫無待處理項目</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'delivery' && (
          <UnifiedTaskDashboard 
            logs={mailLogs} 
            onUpdateLogs={logs => { setMailLogs(logs); localStorage.setItem(LOG_KEY, JSON.stringify(logs)); }} 
            onProcessMail={() => {}} 
          />
        )}

        {activeTab === 'crm' && (
          <CustomerManagement 
            customers={customers} 
            logs={mailLogs} 
            onUpdate={c => { setCustomers(c); localStorage.setItem(DB_KEY, JSON.stringify(c)); }} 
            onProcessMail={(id, status) => {
              const updated = mailLogs.map(l => l.id === id ? { ...l, processingStatus: status, isArchived: true } : l);
              setMailLogs(updated);
              localStorage.setItem(LOG_KEY, JSON.stringify(updated));
            }} 
            onDeleteCustomer={id => {
              const updated = customers.filter(c => c.customerId !== id);
              setCustomers(updated);
              localStorage.setItem(DB_KEY, JSON.stringify(updated));
            }} 
          />
        )}
      </main>

      <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[92%] max-w-lg bg-white/80 backdrop-blur-2xl border border-white/20 rounded-[45px] shadow-3xl flex justify-around p-4 z-50">
        {[
          { id: 'scan', label: '掃描儀', icon: '📸' },
          { id: 'delivery', label: '任務中心', icon: '🚚' },
          { id: 'crm', label: '資料庫', icon: '👥' },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex flex-col items-center px-8 py-4 rounded-[35px] transition-all duration-500 ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-2xl' : 'text-gray-400 hover:bg-gray-100'}`}>
            <span className="text-2xl mb-1.5">{tab.icon}</span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">{tab.label}</span>
          </button>
        ))}
      </nav>

      {globalSelectedCustomer && (
        <CustomerDashboard 
          customer={globalSelectedCustomer} logs={mailLogs} onClose={() => setGlobalSelectedCustomer(null)}
          onUpdateCustomer={(c, oldId) => { 
            const updated = customers.map(old => old.customerId === oldId ? c : old); 
            setCustomers(updated); 
            localStorage.setItem(DB_KEY, JSON.stringify(updated)); 
            setGlobalSelectedCustomer(c);
          }}
          onDeleteCustomer={id => { const updated = customers.filter(c => c.customerId !== id); setCustomers(updated); localStorage.setItem(DB_KEY, JSON.stringify(updated)); setGlobalSelectedCustomer(null); }}
          onProcessMail={(id, status) => { const updated = mailLogs.map(l => l.id === id ? { ...l, processingStatus: status, isArchived: true } : l); setMailLogs(updated); localStorage.setItem(LOG_KEY, JSON.stringify(updated)); }}
        />
      )}

      {isManualNotifyOpen && <ManualNotificationModal customers={customers} onClose={() => setIsManualNotifyOpen(false)} />}
      
      {isSystemSettingsOpen && (
        <SystemSettingsModal 
          customers={customers} mailLogs={mailLogs} scheduledMails={[]} currentVenue={currentVenue} viewMode="staff"
          onRestore={handleSystemRestore}
          onClose={() => setIsSystemSettingsOpen(false)}
        />
      )}
    </div>
  );
};

export default App;