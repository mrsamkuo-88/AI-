
import React, { useState, useEffect } from 'react';
import { processImageForMail } from './services/geminiService';
import { GeminiServiceResponse, MatchedUser, MailLogEntry, MailProcessingStatus, ScheduledMail } from './types';
import ImageUploader from './components/ImageUploader';
import NotificationDisplay from './components/NotificationDisplay';
import CustomerRegistrationView from './components/CustomerRegistrationView';
import CustomerManagement from './components/CustomerManagement';
import UnifiedTaskDashboard from './components/DeliveryManagement';
import CustomerDashboard from './components/CustomerDashboard';
import ManualNotificationModal from './components/ManualNotificationModal';
import SystemSettingsModal, { BackupData } from './components/SystemSettingsModal';
import { LIFF_ID, MOCK_CUSTOMER_DB, APP_VERSION } from './constants';

const DB_KEY = 'AI_MAIL_ASSISTANT_CRM_V5';
const LOG_KEY = 'AI_MAIL_ACTIVITY_LOG_V5';
const SCHEDULE_KEY = 'AI_MAIL_SCHEDULE_QUEUE_V5';
const MODE_KEY = 'AI_MAIL_APP_MODE';
const VENUE_KEY = 'AI_MAIL_CURRENT_VENUE';

const VENUES = [
  { name: '民權館', floor: '21樓' },
  { name: '四維館', floor: '12樓' }
];

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<'staff' | 'customer'>(() => {
    return localStorage.getItem(MODE_KEY) === 'customer' ? 'customer' : 'staff';
  });

  const [currentVenue, setCurrentVenue] = useState(() => {
    const saved = localStorage.getItem(VENUE_KEY);
    return saved ? JSON.parse(saved) : VENUES[0];
  });

  const updateVenue = (venue: typeof VENUES[0]) => {
    setCurrentVenue(venue);
    localStorage.setItem(VENUE_KEY, JSON.stringify(venue));
  };

  const [mailLogs, setMailLogs] = useState<MailLogEntry[]>([]);
  const [scheduledMails, setScheduledMails] = useState<ScheduledMail[]>([]);
  const [customers, setCustomers] = useState<MatchedUser[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });
  const [activeTab, setActiveTab] = useState<'scan' | 'inbox' | 'crm' | 'delivery'>('scan');
  const [lineProfile, setLineProfile] = useState<{ displayName: string, pictureUrl?: string, userId: string } | null>(null);
  const [globalSelectedCustomer, setGlobalSelectedCustomer] = useState<MatchedUser | null>(null);
  const [isManualNotifyOpen, setIsManualNotifyOpen] = useState(false);
  const [isSystemSettingsOpen, setIsSystemSettingsOpen] = useState(false);
  const [isReloading, setIsReloading] = useState(false);

  useEffect(() => {
    const savedCrm = localStorage.getItem(DB_KEY);
    setCustomers(savedCrm ? JSON.parse(savedCrm) : MOCK_CUSTOMER_DB);
    const savedLogs = localStorage.getItem(LOG_KEY);
    if (savedLogs) setMailLogs(JSON.parse(savedLogs));
    const savedSchedule = localStorage.getItem(SCHEDULE_KEY);
    if (savedSchedule) setScheduledMails(JSON.parse(savedSchedule));
    
    const liff = (window as any).liff;
    if (liff) {
      liff.init({ liffId: LIFF_ID }).then(() => {
        if (liff.isLoggedIn()) {
          liff.getProfile().then(setLineProfile);
        }
      }).catch((err: any) => console.warn("LIFF not available", err));
    }
  }, []);

  const saveLogs = (newLogs: MailLogEntry[]) => {
    const sorted = [...newLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setMailLogs(sorted);
    localStorage.setItem(LOG_KEY, JSON.stringify(sorted));
  };

  const handleProcessAction = (logId: string, status?: MailProcessingStatus, isArchived?: boolean) => {
    const updatedLogs = mailLogs.map(l => 
      l.id === logId ? { 
        ...l, 
        isNotified: status === 'notified' ? true : l.isNotified, 
        processingStatus: status || l.processingStatus,
        isArchived: isArchived !== undefined ? isArchived : l.isArchived,
        processedAt: (isArchived && !l.isArchived) ? new Date().toISOString() : l.processedAt
      } : l
    );
    saveLogs(updatedLogs);
  };

  const handleImageScan = async (files: File[]) => {
    setIsProcessing(true);
    setProcessingProgress({ current: 0, total: files.length });
    const newEntries: MailLogEntry[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const reader = new FileReader();
        const base64 = await new Promise<string>((res) => {
          reader.onload = () => res((reader.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });
        
        const imageDataUrl = URL.createObjectURL(file);
        const result = await processImageForMail(base64, file.type, currentVenue);
        
        if (result.analysis) {
          const entry: MailLogEntry = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString(),
            analysis: result.analysis,
            imageUrl: imageDataUrl,
            fileName: file.name,
            isNotified: false,
            processingStatus: 'pending',
            isArchived: false
          };
          newEntries.push(entry);
        }
      } catch (e: any) {
        console.error(`辨識失敗: ${e.message}`);
      }
      setProcessingProgress({ current: i + 1, total: files.length });
    }

    if (newEntries.length > 0) {
      saveLogs([...newEntries, ...mailLogs]);
    }
    setIsProcessing(false);
  };

  const handleForceUpdate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsReloading(true);
    if (confirm('🚀 正在執行【ULTRA 雲端重新整理】\n系統將會嘗試繞過所有快取載入 V6.1.0。是否繼續？')) {
      const freshUrl = `${window.location.origin}${window.location.pathname}?sync_v=610&t=${Date.now()}`;
      window.location.replace(freshUrl);
    } else {
      setIsReloading(false);
    }
  };

  if (viewMode === 'customer') {
    return <CustomerRegistrationView profile={lineProfile} onRegister={() => {}} isRegistered={false} />;
  }

  const pendingProcessingLogs = mailLogs.filter(log => (log.processingStatus === 'pending' || log.processingStatus === 'notified') && !log.isArchived);

  return (
    <div className="flex flex-col min-h-screen w-full max-w-2xl mx-auto bg-[#F0F2F5] shadow-2xl overflow-hidden relative font-sans">
      {isReloading && (
        <div className="fixed inset-0 z-[200] bg-[#1E293B]/95 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in">
          <div className="w-20 h-20 border-[6px] border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-6"></div>
          <p className="font-black text-white text-lg tracking-widest uppercase animate-pulse">Ultra Syncing V6.1.0...</p>
        </div>
      )}

      {globalSelectedCustomer && (
        <CustomerDashboard 
          customer={globalSelectedCustomer}
          logs={mailLogs}
          onUpdateCustomer={(updated) => {
            const updatedCrm = customers.map(c => c.customerId === updated.customerId ? updated : c);
            setCustomers(updatedCrm);
            localStorage.setItem(DB_KEY, JSON.stringify(updatedCrm));
            setGlobalSelectedCustomer(updated);
          }}
          onDeleteCustomer={(id) => {
            const updatedCrm = customers.filter(c => c.customerId !== id);
            setCustomers(updatedCrm);
            localStorage.setItem(DB_KEY, JSON.stringify(updatedCrm));
            setGlobalSelectedCustomer(null);
          }}
          onProcessMail={handleProcessAction}
          onClose={() => setGlobalSelectedCustomer(null)}
        />
      )}

      {isManualNotifyOpen && (
        <ManualNotificationModal 
          customers={customers}
          onClose={() => setIsManualNotifyOpen(false)}
        />
      )}

      {isSystemSettingsOpen && (
        <SystemSettingsModal 
          customers={customers}
          mailLogs={mailLogs}
          scheduledMails={scheduledMails}
          currentVenue={currentVenue}
          viewMode={viewMode}
          onRestore={(data) => {
            if (data.customers) localStorage.setItem(DB_KEY, JSON.stringify(data.customers));
            if (data.mailLogs) localStorage.setItem(LOG_KEY, JSON.stringify(data.mailLogs));
            if (data.appConfig) {
              localStorage.setItem(VENUE_KEY, JSON.stringify(data.appConfig.venue));
              localStorage.setItem(MODE_KEY, data.appConfig.mode);
            }
            window.location.reload();
          }}
          onClose={() => setIsSystemSettingsOpen(false)}
        />
      )}

      <header className="bg-[#1E293B] px-6 py-5 flex justify-between items-center sticky top-0 z-50 shadow-2xl">
        <div className="flex items-center space-x-4">
          <div className="relative group cursor-pointer" onClick={handleForceUpdate}>
            <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg group-hover:scale-110 transition-transform">✉️</div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 border-2 border-[#1E293B] rounded-full animate-ping"></div>
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-white tracking-tighter leading-none">道騰 AI 郵務 <span className="text-emerald-400">V6.1</span></h1>
            <div className="flex items-center space-x-2 mt-1.5">
              <button 
                onClick={() => setIsSystemSettingsOpen(true)} 
                className="text-[10px] text-gray-400 font-black uppercase tracking-widest hover:text-white transition-colors"
              >
                {currentVenue.name} ⚙️
              </button>
              <div className="h-3 w-[1px] bg-white/10 mx-1"></div>
              <button 
                onClick={handleForceUpdate}
                className="text-[10px] font-black text-emerald-400 uppercase tracking-tighter hover:text-white transition-all"
              >
                🔄 雲端更新
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 backdrop-blur-md">
          {VENUES.map(v => (
            <button 
              key={v.name}
              onClick={() => updateVenue(v)}
              className={`px-4 py-2 text-[10px] font-black rounded-xl transition-all ${currentVenue.name === v.name ? 'bg-indigo-500 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}
            >
              {v.name}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-10 pb-44">
        {activeTab === 'scan' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <ImageUploader 
              onImagesSelect={handleImageScan} 
              onOpenManualNotification={() => setIsManualNotifyOpen(true)}
            />
            
            {isProcessing && (
              <div className="bg-indigo-600 p-12 rounded-[56px] text-center text-white shadow-3xl shadow-indigo-200 animate-in zoom-in border-4 border-indigo-500">
                 <div className="relative w-28 h-28 mx-auto mb-10">
                    <div className="absolute inset-0 border-[6px] border-white/20 rounded-full"></div>
                    <div className="absolute inset-0 border-[6px] border-white border-t-transparent rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center font-black text-2xl">
                      {Math.round((processingProgress.current / processingProgress.total) * 100)}%
                    </div>
                 </div>
                 <h3 className="font-black text-2xl mb-3">AI 深度辨識中</h3>
                 <p className="text-white/60 text-xs font-black uppercase tracking-[0.3em]">
                   V6 CORE: 第 {processingProgress.current} / {processingProgress.total} 封
                 </p>
              </div>
            )}

            {pendingProcessingLogs.length > 0 && (
              <div className="space-y-8">
                <div className="flex items-center justify-between px-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-8 bg-emerald-500 rounded-full"></div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">待處理項目 ({pendingProcessingLogs.length})</h3>
                  </div>
                </div>
                <div className="space-y-8">
                  {pendingProcessingLogs.map(log => (
                    <NotificationDisplay 
                      key={log.id}
                      analysis={log.analysis}
                      ocrText=""
                      imageUrl={log.imageUrl}
                      allCustomers={customers}
                      isNotified={log.isNotified}
                      currentStatus={log.processingStatus}
                      isArchived={log.isArchived}
                      onDelete={() => saveLogs(mailLogs.filter(l => l.id !== log.id))}
                      onMarkAsNotified={(status) => handleProcessAction(log.id, status)}
                      onOpenDashboard={(customer) => setGlobalSelectedCustomer(customer)}
                      onUpdateMatch={(user) => saveLogs(mailLogs.map(l => l.id === log.id ? {...l, analysis: { ...l.analysis, matchedUser: { ...user, status: 'matched' as const } } } : l))}
                    />
                  ))}
                </div>
              </div>
            )}

            {!isProcessing && pendingProcessingLogs.length === 0 && (
              <div className="py-28 text-center bg-white rounded-[64px] border border-gray-100 shadow-xl flex flex-col items-center">
                <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-8 grayscale opacity-20">
                  <span className="text-6xl">📭</span>
                </div>
                <p className="text-[12px] font-black text-gray-300 uppercase tracking-[0.5em]">目前系統清空</p>
                <p className="text-gray-400 text-[10px] font-bold mt-3">請上傳新的郵件照片開始 V6.1 作業</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'crm' && (
          <CustomerManagement 
            customers={customers} 
            logs={mailLogs}
            onUpdate={(updated) => { setCustomers(updated); localStorage.setItem(DB_KEY, JSON.stringify(updated)); }}
            onProcessMail={handleProcessAction}
            onDeleteCustomer={(id) => {
              const updated = customers.filter(c => c.customerId !== id);
              setCustomers(updated);
              localStorage.setItem(DB_KEY, JSON.stringify(updated));
            }}
          />
        )}

        {activeTab === 'delivery' && (
          <UnifiedTaskDashboard 
            logs={mailLogs} 
            onUpdateLogs={saveLogs}
            onProcessMail={handleProcessAction}
          />
        )}
      </main>

      <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[92%] max-w-lg bg-white/80 backdrop-blur-2xl border border-white/20 rounded-[45px] shadow-3xl flex justify-around p-4 z-50">
        {[
          { id: 'scan', label: '掃描儀', icon: '📸' },
          { id: 'crm', label: '資料庫', icon: '👥' },
          { id: 'delivery', label: '任務中心', icon: '🚚' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex flex-col items-center px-8 py-4 rounded-[35px] transition-all duration-500 ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-200' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
          >
            <span className="text-2xl mb-1.5">{tab.icon}</span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className="fixed top-24 right-4 z-[60] pointer-events-none">
         <div className="bg-emerald-500/10 backdrop-blur text-[8px] font-black text-emerald-600 px-3 py-1 rounded-full border border-emerald-500/20 uppercase tracking-widest shadow-sm">
           V6.1.0 STABLE
         </div>
      </div>
    </div>
  );
};

export default App;
