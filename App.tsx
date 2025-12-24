
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
  const [activeTab, setActiveTab] = useState<'scan' | 'inbox' | 'crm' | 'delivery'>('scan');
  const [inboxSubTab, setInboxSubTab] = useState<MailProcessingStatus | 'pending' | 'archived'>('pending');
  const [lineProfile, setLineProfile] = useState<{ displayName: string, pictureUrl?: string, userId: string } | null>(null);
  const [globalSelectedCustomer, setGlobalSelectedCustomer] = useState<MatchedUser | null>(null);
  const [isManualNotifyOpen, setIsManualNotifyOpen] = useState(false);
  const [isSystemSettingsOpen, setIsSystemSettingsOpen] = useState(false);

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

  const handleDeleteCustomer = (customerId: string) => {
    const updatedCrm = customers.filter(c => c.customerId !== customerId);
    setCustomers(updatedCrm);
    localStorage.setItem(DB_KEY, JSON.stringify(updatedCrm));
    setGlobalSelectedCustomer(null);
  };

  const handleClearAllLogs = () => {
    if (confirm('確定要清空所有郵件紀錄與掃描歷史嗎？此操作無法撤銷。')) {
      saveLogs([]);
      localStorage.removeItem(SCHEDULE_KEY);
      setScheduledMails([]);
    }
  };

  const handleRestoreSystem = (data: BackupData) => {
    if (data.customers) {
      localStorage.setItem(DB_KEY, JSON.stringify(data.customers));
    }
    if (data.mailLogs) {
      localStorage.setItem(LOG_KEY, JSON.stringify(data.mailLogs));
    }
    if (data.scheduledMails) {
      localStorage.setItem(SCHEDULE_KEY, JSON.stringify(data.scheduledMails));
    }
    if (data.appConfig) {
      localStorage.setItem(VENUE_KEY, JSON.stringify(data.appConfig.venue));
      localStorage.setItem(MODE_KEY, data.appConfig.mode);
    }
    window.location.reload();
  };

  const handleProcessAction = (logId: string, status?: MailProcessingStatus, isArchived?: boolean) => {
    const log = mailLogs.find(l => l.id === logId);
    if (!log) return;

    if (status === 'scheduled') {
      const isAlreadyIn = scheduledMails.some(m => m.logId === logId);
      if (!isAlreadyIn) {
        const newEntry: ScheduledMail = {
          id: Math.random().toString(36).substr(2, 9),
          logId: log.id,
          customerId: log.analysis.matchedUser?.customerId || 'N/A',
          customerName: log.analysis.matchedUser?.name || log.analysis.customerName,
          company: log.analysis.matchedUser?.company || log.analysis.companyName || '個人',
          senderName: log.analysis.senderName || '未知寄件人',
          timestamp: new Date().toISOString(),
          isProcessed: false
        };
        const savedSchedule = localStorage.getItem(SCHEDULE_KEY);
        const currentSchedule = savedSchedule ? JSON.parse(savedSchedule) : [];
        const newSchedule = [newEntry, ...currentSchedule];
        setScheduledMails(newSchedule);
        localStorage.setItem(SCHEDULE_KEY, JSON.stringify(newSchedule));
      }
    }
    
    const updatedLogs = mailLogs.map(l => 
      l.id === logId ? { 
        ...l, 
        isNotified: true, 
        processingStatus: status || l.processingStatus,
        isArchived: isArchived !== undefined ? isArchived : l.isArchived,
        processedAt: (isArchived && !l.isArchived) ? new Date().toISOString() : l.processedAt
      } : l
    );
    saveLogs(updatedLogs);
  };

  const handleImageScan = async (files: File[]) => {
    setIsProcessing(true);
    const newEntries: MailLogEntry[] = [];
    
    for (const file of files) {
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
        alert(`辨識失敗: ${e.message}`);
      }
    }

    if (newEntries.length > 0) {
      saveLogs([...newEntries, ...mailLogs]);
      // 修正：不再自動跳轉到 inbox，維持在 scan 頁面方便直接處理
    }
    setIsProcessing(false);
  };

  if (viewMode === 'customer') {
    return <CustomerRegistrationView profile={lineProfile} onRegister={(n, c) => {}} isRegistered={false} />;
  }

  // 待處理項目：狀態為 pending 且未通知，且未歸檔
  const pendingProcessingLogs = mailLogs.filter(log => (log.processingStatus === 'pending' && !log.isNotified) && !log.isArchived);
  
  // 已處理項目（近期紀錄）：狀態不是 pending 或 已通知，或已歸檔
  const processedRecentLogs = mailLogs.filter(log => (log.processingStatus !== 'pending' || log.isNotified) || log.isArchived);

  const filteredInboxLogs = mailLogs.filter(log => {
    if (inboxSubTab === 'archived') return log.isArchived === true;
    if (inboxSubTab === 'pending') return (log.processingStatus === 'pending' || log.processingStatus === 'notified') && !log.isArchived;
    return log.processingStatus === inboxSubTab && !log.isArchived;
  });

  return (
    <div className="flex flex-col min-h-screen w-full max-w-2xl mx-auto bg-[#F8F9FE] shadow-2xl overflow-hidden relative">
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
          onDeleteCustomer={handleDeleteCustomer}
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
          onRestore={handleRestoreSystem}
          onClose={() => setIsSystemSettingsOpen(false)}
        />
      )}

      <header className="bg-white/95 backdrop-blur-md border-b px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg">✉️</div>
          <div className="flex flex-col">
            <h1 className="text-lg font-black text-gray-900 tracking-tighter">道騰 AI 郵務管理</h1>
            <div className="flex items-center space-x-2">
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.2em] leading-tight">{currentVenue.name} | {currentVenue.floor}</p>
              <button 
                onClick={() => setIsSystemSettingsOpen(true)}
                className="w-4 h-4 text-gray-300 hover:text-indigo-400 transition-colors"
                title="系統設定"
              >
                ⚙️
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

      <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 pb-40">
        {activeTab === 'scan' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-6 bg-indigo-50 rounded-[32px] border border-indigo-100 flex items-center justify-between">
              <span className="text-xs font-black text-indigo-600 tracking-tight">AI 智能掃描模式：{currentVenue.name}</span>
              <span className="text-[10px] bg-white px-3 py-1 rounded-full text-indigo-500 font-bold shadow-sm">辨識模組已就緒</span>
            </div>
            
            <ImageUploader 
              onImagesSelect={handleImageScan} 
              onOpenManualNotification={() => setIsManualNotifyOpen(true)}
            />
            
            {isProcessing && (
              <div className="bg-white p-20 rounded-[48px] border-2 border-dashed border-indigo-200 text-center animate-pulse shadow-xl shadow-indigo-100/50">
                 <div className="animate-spin h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-6"></div>
                 <h3 className="font-black text-indigo-600 text-lg">AI 正在深度分析內容...</h3>
              </div>
            )}

            {/* 待處理工作區：顯示剛掃描完尚未動作的信件 */}
            {pendingProcessingLogs.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 bg-rose-500 rounded-full animate-ping"></span>
                    <h3 className="text-lg font-black text-gray-800 tracking-tight">待處理郵件 ({pendingProcessingLogs.length})</h3>
                  </div>
                  <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 px-3 py-1 rounded-full">需要立即處分</span>
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

            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-lg font-black text-gray-800 tracking-tight">近期掃描紀錄</h3>
                {mailLogs.length > 0 && (
                  <button 
                    onClick={handleClearAllLogs}
                    className="text-[10px] font-black text-red-400 hover:text-red-500 uppercase tracking-widest transition-colors"
                  >
                    清空所有紀錄
                  </button>
                )}
              </div>
              
              <div className="space-y-3">
                {processedRecentLogs.slice(0, 10).map(log => (
                  <div key={log.id} onClick={() => setActiveTab('inbox')} className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm flex items-center space-x-4 group hover:shadow-md transition-all cursor-pointer">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 overflow-hidden flex-shrink-0 border border-gray-100">
                      {log.imageUrl ? (
                        <img src={log.imageUrl} className="w-full h-full object-cover" alt="scan" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl">📄</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest truncate max-w-[150px]">
                          {log.fileName || '未知檔案'}
                        </p>
                        <p className="text-[9px] font-bold text-gray-300 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs font-bold text-gray-700 truncate">
                          {log.analysis.summary}
                        </p>
                        {log.isArchived ? (
                          <span className="text-[8px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded font-black">已結案</span>
                        ) : (
                          <span className={`text-[8px] px-1.5 py-0.5 rounded font-black ${log.isNotified ? 'bg-indigo-50 text-indigo-500' : 'bg-rose-50 text-rose-500'}`}>
                            {log.isNotified ? '已通知' : '待處分'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-indigo-200 opacity-0 group-hover:opacity-100 transition-opacity">➔</div>
                  </div>
                ))}
                
                {processedRecentLogs.length === 0 && !isProcessing && pendingProcessingLogs.length === 0 && (
                  <div className="py-20 text-center bg-white/50 rounded-[40px] border border-dashed border-gray-200">
                    <div className="text-4xl mb-4 opacity-10">📸</div>
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">尚未有任何掃描紀錄</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'inbox' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
               <h2 className="text-3xl font-black text-gray-900 tracking-tight">處理中心</h2>
               <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dashboards</div>
            </div>

            <div className="flex space-x-2 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
              {[
                { id: 'pending', label: '待處分流', color: 'bg-indigo-600' },
                { id: 'scanned', label: '已掃描', color: 'bg-blue-500' },
                { id: 'move_to_1f', label: '1F 存放', color: 'bg-orange-500' },
                { id: 'at_counter_12', label: '12F 櫃台', color: 'bg-teal-600' },
                { id: 'at_counter', label: '21F 櫃台', color: 'bg-emerald-500' },
                { id: 'scheduled', label: '月底寄送', color: 'bg-purple-600' },
                { id: 'archived', label: '已結案歷史', color: 'bg-gray-800' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setInboxSubTab(tab.id as any)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black whitespace-nowrap transition-all border-2 ${inboxSubTab === tab.id ? `${tab.color} text-white border-transparent shadow-lg` : 'bg-white text-gray-400 border-gray-100 hover:border-indigo-100'}`}
                >
                  {tab.label} ({
                    tab.id === 'archived' ? mailLogs.filter(l => l.isArchived).length :
                    tab.id === 'pending' ? mailLogs.filter(l => (l.processingStatus === 'pending' || l.processingStatus === 'notified') && !l.isArchived).length :
                    mailLogs.filter(l => l.processingStatus === tab.id && !l.isArchived).length
                  })
                </button>
              ))}
            </div>

            <div className="space-y-6">
              {filteredInboxLogs.map(log => (
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
              {filteredInboxLogs.length === 0 && (
                <div className="py-32 text-center bg-white rounded-[48px] border border-dashed border-gray-100">
                   <div className="text-5xl mb-6 opacity-20">📭</div>
                   <p className="text-gray-300 font-black text-sm uppercase tracking-widest">此看板目前暫無資料</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'crm' && (
          <CustomerManagement 
            customers={customers} 
            logs={mailLogs}
            onUpdate={(updated) => {
              setCustomers(updated);
              localStorage.setItem(DB_KEY, JSON.stringify(updated));
            }} 
            onProcessMail={handleProcessAction}
            onDeleteCustomer={handleDeleteCustomer}
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

      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-lg bg-white/90 backdrop-blur-xl border border-white/40 px-6 py-4 flex justify-between items-center z-50 rounded-[40px] shadow-2xl">
        <button onClick={() => setActiveTab('scan')} className={`flex flex-col items-center space-y-1.5 transition-all duration-300 ${activeTab === 'scan' ? 'text-indigo-600 scale-110' : 'text-gray-300 hover:text-gray-400'}`}>
          <div className="text-2xl">📸</div>
          <span className="text-[9px] font-black uppercase tracking-widest">掃描</span>
        </button>
        <button onClick={() => setActiveTab('inbox')} className={`flex flex-col items-center space-y-1.5 transition-all duration-300 ${activeTab === 'inbox' ? 'text-indigo-600 scale-110' : 'text-gray-300 hover:text-gray-400'}`}>
          <div className="relative">
            <div className="text-2xl">📥</div>
            {mailLogs.some(l => (l.processingStatus === 'pending' || l.processingStatus === 'notified') && !l.isArchived) && (
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-[2.5px] border-white shadow-sm"></div>
            )}
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest">中心</span>
        </button>
        <button onClick={() => setActiveTab('delivery')} className={`flex flex-col items-center space-y-1.5 transition-all duration-300 ${activeTab === 'delivery' ? 'text-indigo-600 scale-110' : 'text-gray-300 hover:text-gray-400'}`}>
          <div className="text-2xl">📋</div>
          <span className="text-[9px] font-black uppercase tracking-widest">任務</span>
        </button>
        <button onClick={() => setActiveTab('crm')} className={`flex flex-col items-center space-y-1.5 transition-all duration-300 ${activeTab === 'crm' ? 'text-indigo-600 scale-110' : 'text-gray-300 hover:text-gray-400'}`}>
          <div className="text-2xl">👥</div>
          <span className="text-[9px] font-black uppercase tracking-widest">資料庫</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
