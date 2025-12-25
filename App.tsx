
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
    e.stopPropagation(); // 確保點擊事件不會冒泡
    setIsReloading(true);
    setTimeout(() => {
      if (confirm('💡 確定要重新同步至雲端最新版本嗎？\n系統將會嘗試繞過所有快取強制重載。')) {
        const currentUrl = window.location.origin + window.location.pathname;
        const newUrl = `${currentUrl}?reload_token=${Date.now()}`;
        window.location.replace(newUrl);
      } else {
        setIsReloading(false);
      }
    }, 50);
  };

  if (viewMode === 'customer') {
    return <CustomerRegistrationView profile={lineProfile} onRegister={() => {}} isRegistered={false} />;
  }

  const pendingProcessingLogs = mailLogs.filter(log => (log.processingStatus === 'pending' || log.processingStatus === 'notified') && !log.isArchived);

  return (
    <div className="flex flex-col min-h-screen w-full max-w-2xl mx-auto bg-[#F8F9FE] shadow-2xl overflow-hidden relative">
      {isReloading && (
        <div className="fixed inset-0 z-[100] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="font-black text-indigo-600 text-sm tracking-widest uppercase animate-pulse">Force Reloading...</p>
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

      <header className="bg-white/95 backdrop-blur-md border-b px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg">✉️</div>
            {/* 綠色連線指示燈：代表版本已同步 */}
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full animate-pulse shadow-sm"></div>
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-black text-gray-900 tracking-tighter leading-none">道騰 AI 郵務</h1>
            <div className="flex items-center space-x-2 mt-1">
              <button 
                onClick={() => setIsSystemSettingsOpen(true)} 
                className="text-[9px] text-gray-400 font-bold uppercase tracking-widest hover:text-indigo-600 transition-colors"
              >
                {currentVenue.name} ⚙️
              </button>
              
              {/* 大按鈕同步區：增加 z-index 與內距確保手機容易點擊 */}
              <button 
                onClick={handleForceUpdate}
                title="強制同步至最新版本"
                className="relative z-50 flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-90 border border-indigo-100"
              >
                <span className="text-xs">🔄</span>
                <span className="text-[10px] font-black uppercase tracking-tighter">強制同步</span>
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex bg-gray-100 p-1 rounded-xl">
          {VENUES.map(v => (
            <button 
              key={v.name}
              onClick={() => updateVenue(v)}
              className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${currentVenue.name === v.name ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}
            >
              {v.name}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-8 pb-40">
        {activeTab === 'scan' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ImageUploader 
              onImagesSelect={handleImageScan} 
              onOpenManualNotification={() => setIsManualNotifyOpen(true)}
            />
            
            {isProcessing && (
              <div className="bg-indigo-600 p-10 rounded-[48px] text-center text-white shadow-2xl shadow-indigo-200 animate-in zoom-in border-4 border-indigo-500">
                 <div className="relative w-24 h-24 mx-auto mb-8">
                    <div className="absolute inset-0 border-4 border-white/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center font-black text-lg">
                      {Math.round((processingProgress.current / processingProgress.total) * 100)}%
                    </div>
                 </div>
                 <h3 className="font-black text-xl mb-2">AI 批次辨識中...</h3>
                 <p className="text-white/70 text-xs font-black uppercase tracking-[0.2em]">
                   正在處理第 {processingProgress.current} / {processingProgress.total} 封郵件
                 </p>
              </div>
            )}

            {pendingProcessingLogs.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-xl font-black text-gray-800 tracking-tight">待處理通知 ({pendingProcessingLogs.length})</h3>
                  <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-4 py-1.5 rounded-full border border-indigo-100">檢查結果並發送</span>
                </div>
                <div className="space-y-6">
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
              <div className="py-24 text-center bg-white/50 rounded-[56px] border-4 border-dashed border-gray-100 flex flex-col items-center">
                <div className="text-5xl mb-6 opacity-20 grayscale">📭</div>
                <p className="text-[11px] font-black text-gray-300 uppercase tracking-[0.4em]">目前暫無待處理郵件</p>
                <p className="text-gray-400 text-[10px] font-bold mt-2">請點擊上方按鈕開始批次上傳</p>
              </div>
            )}

            <div className="flex flex-col items-center py-6">
              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-300">DEPLOYED VERSION: {APP_VERSION}</p>
              <p className="text-[8px] text-gray-300 mt-2">© DT Space System Integrity Verified</p>
            </div>
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

      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white/90 backdrop-blur-xl border border-white/20 rounded-[40px] shadow-2xl flex justify-around p-3 z-50">
        {[
          { id: 'scan', label: '掃描', icon: '📸' },
          { id: 'crm', label: '客戶', icon: '👥' },
          { id: 'delivery', label: '任務', icon: '🚚' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex flex-col items-center px-6 py-3 rounded-[30px] transition-all duration-300 ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            <span className="text-xl mb-1">{tab.icon}</span>
            <span className="text-[9px] font-black uppercase tracking-widest">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default App;
