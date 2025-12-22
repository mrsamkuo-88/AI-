
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { processImageForMail } from './services/geminiService';
import { CustomerMailAnalysis, GeminiServiceResponse, MatchedUser, OCRHistoryItem } from './types';
import ImageUploader from './components/ImageUploader';
import NotificationDisplay from './components/NotificationDisplay';
import LoadingSpinner from './components/LoadingSpinner';
import ApiKeyChecker from './components/ApiKeyChecker';
import {
  PROCESSING_MESSAGE,
  LIFF_ID,
  MOCK_CUSTOMER_DB
} from './constants';

interface BatchItem {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: GeminiServiceResponse;
  error?: string;
}

const App: React.FC = () => {
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [ocrHistory, setOcrHistory] = useState<OCRHistoryItem[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isApiKeySelected, setIsApiKeySelected] = useState<boolean>(false);
  const [liffStatus, setLiffStatus] = useState<'loading' | 'success' | 'failed' | 'standalone'>('loading');
  const [lineProfile, setLineProfile] = useState<{ displayName: string, pictureUrl?: string } | null>(null);
  const [showDb, setShowDb] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [showSummary, setShowSummary] = useState<boolean>(false);
  const [totalTime, setTotalTime] = useState<number>(0);
  const [historySortOrder, setHistorySortOrder] = useState<'desc' | 'asc'>('desc');

  useEffect(() => {
    const initLiff = async () => {
      // @ts-ignore
      const liff = window.liff;
      if (!liff) {
        setLiffStatus('standalone');
        return;
      }

      if (!LIFF_ID || LIFF_ID === "YOUR_LIFF_ID") {
        console.warn("LIFF ID is not configured.");
        setLiffStatus('standalone');
        return;
      }

      try {
        await liff.init({ liffId: LIFF_ID });
        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          setLineProfile(profile);
          setLiffStatus('success');
        } else {
          // 在 LINE 環境外自動嘗試登入，或顯示未登入狀態
          setLiffStatus('standalone');
        }
      } catch (err) {
        console.error("LIFF Init Error:", err);
        setLiffStatus('failed');
      }
    };
    initLiff();
  }, []);

  useEffect(() => {
    const savedHistory = localStorage.getItem('ocr_mail_history');
    if (savedHistory) {
      try { setOcrHistory(JSON.parse(savedHistory)); } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('ocr_mail_history', JSON.stringify(ocrHistory));
  }, [ocrHistory]);

  const progressStats = useMemo(() => {
    const total = batchItems.length;
    if (total === 0) return { total: 0, completed: 0, success: 0, failed: 0, percent: 0 };
    const completedItems = batchItems.filter(i => i.status === 'completed');
    const failedItems = batchItems.filter(i => i.status === 'failed');
    const completedCount = completedItems.length + failedItems.length;
    return { total, completed: completedCount, success: completedItems.length, failed: failedItems.length, percent: Math.round((completedCount / total) * 100) };
  }, [batchItems]);

  const checkApiKey = useCallback(async () => {
    // @ts-ignore
    if (window.aistudio?.hasSelectedApiKey) {
      // @ts-ignore
      setIsApiKeySelected(await window.aistudio.hasSelectedApiKey());
    } else {
      setIsApiKeySelected(!!process.env.API_KEY);
    }
  }, []);

  useEffect(() => { checkApiKey(); }, [checkApiKey]);

  const handleFilesSelect = (files: File[]) => {
    const newItems: BatchItem[] = files.map(file => ({ id: Math.random().toString(36).substring(7), file, status: 'pending' }));
    setBatchItems(prev => [...prev, ...newItems]);
  };

  const handleManualUpdateMatch = (itemId: string, user: MatchedUser) => {
    setBatchItems(prev => prev.map(item => {
      if (item.id === itemId && item.result && item.result.analysis) {
        return {
          ...item,
          result: { ...item.result, analysis: { ...item.result.analysis, matchedUser: user } }
        };
      }
      return item;
    }));
  };

  const handleDeleteItem = (itemId: string) => {
    setBatchItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleBatchProcess = async () => {
    if (batchItems.length === 0 || isProcessing) return;
    setIsProcessing(true);
    const start = performance.now();
    const itemsToProcess = batchItems.filter(item => item.status === 'pending' || item.status === 'failed');

    await Promise.all(itemsToProcess.map(async (item) => {
      setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'processing' } : i));
      try {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(item.file);
        });
        const base64 = await base64Promise;
        const result = await processImageForMail(base64, item.file.type);
        setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'completed', result } : i));

        if (result.analysis) {
          const historyItem: OCRHistoryItem = {
            id: Math.random().toString(36).substring(7),
            timestamp: Date.now(),
            fileName: item.file.name,
            customerName: result.analysis.customerName,
            action: result.analysis.requestedAction,
            isUrgent: result.analysis.isUrgent,
            category: result.analysis.mailCategory || 'normal'
          };
          setOcrHistory(prev => [historyItem, ...prev]);
        }
      } catch (e: any) {
        setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'failed', error: e.message } : i));
      }
    }));
    setTotalTime(performance.now() - start);
    setIsProcessing(false);
    setShowSummary(true);
  };

  return (
    <div className="flex flex-col items-center p-4 sm:p-8 bg-white shadow-2xl rounded-3xl w-full max-w-2xl min-h-screen sm:min-h-[90vh] relative overflow-hidden">
      
      {/* LINE 使用者資訊狀態欄 */}
      <div className="w-full flex items-center justify-between mb-4 px-2 py-2 bg-gray-50 rounded-2xl border border-gray-100">
        <div className="flex items-center space-x-2">
          {lineProfile ? (
            <>
              <img src={lineProfile.pictureUrl} className="w-6 h-6 rounded-full border border-indigo-200" alt="me" />
              <span className="text-[10px] font-black text-gray-600">Hi, {lineProfile.displayName}</span>
              <span className="text-[9px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded font-black uppercase">LIFF ON</span>
            </>
          ) : (
            <>
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px]">👤</div>
              <span className="text-[10px] font-black text-gray-400">未登入 LINE</span>
            </>
          )}
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">AI Service Ready</span>
        </div>
      </div>

      <div className="w-full flex justify-between items-center mb-6 px-2">
        <div className="flex items-center space-x-2">
          <div className="bg-indigo-600 p-2 rounded-lg text-white font-bold shadow-indigo-200 shadow-lg">AI</div>
          <h1 className="text-xl font-bold text-gray-800 tracking-tight">智能郵件助手</h1>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={() => setShowHistory(true)} className="flex items-center space-x-1 text-xs bg-indigo-50 px-3 py-2 rounded-xl text-indigo-600 font-bold hover:bg-indigo-100 transition-all">
            <span>📜 歷史</span>
            {ocrHistory.length > 0 && <span className="bg-indigo-600 text-white text-[9px] px-1.5 py-0.5 rounded-full">{ocrHistory.length}</span>}
          </button>
          <button onClick={() => setShowDb(true)} className="text-xs bg-gray-100 p-2 rounded-xl text-gray-600 hover:bg-gray-200">📂</button>
        </div>
      </div>

      {!isApiKeySelected ? (
        <ApiKeyChecker 
          onOpenApiKeySelection={() => {
            // @ts-ignore
            window.aistudio?.openSelectKey()?.then(() => checkApiKey());
          }} 
          error={error} 
        />
      ) : (
        <div className="w-full space-y-6">
          <ImageUploader onImagesSelect={handleFilesSelect} />

          {batchItems.length > 0 && (
            <div className="w-full bg-indigo-50/30 rounded-3xl p-6 border-2 border-indigo-100 border-dashed">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-black text-gray-700">批次列隊 ({batchItems.length})</h3>
                {!isProcessing && <button onClick={() => setBatchItems([])} className="text-xs text-red-500 font-bold">清空</button>}
              </div>
              
              <div className="max-h-32 overflow-y-auto space-y-2 mb-4 scrollbar-hide">
                {batchItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm border border-indigo-50 text-[10px] font-bold">
                    <span className="truncate max-w-[150px] text-gray-500">{item.file.name}</span>
                    <div className="flex items-center space-x-2">
                      {item.status === 'processing' && <LoadingSpinner />}
                      {item.status === 'completed' && <span className="text-green-500 text-sm">●</span>}
                      {item.status === 'failed' && <span className="text-red-500 text-sm">●</span>}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-black text-indigo-600">辨識進度</span>
                  <span className="text-[10px] font-black text-indigo-400">{progressStats.percent}%</span>
                </div>
                <div className="w-full h-2 bg-indigo-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 transition-all duration-500" style={{ width: `${progressStats.percent}%` }} />
                </div>
              </div>

              <button
                onClick={handleBatchProcess}
                disabled={isProcessing || batchItems.every(i => i.status === 'completed')}
                className={`w-full py-4 rounded-2xl font-black text-lg transition-all shadow-xl active:scale-95
                  ${isProcessing || batchItems.every(i => i.status === 'completed') ? 'bg-gray-200 text-gray-400' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
              >
                {isProcessing ? '並行辨識中...' : '🚀 開始極速分析'}
              </button>
            </div>
          )}

          <div className="space-y-6">
            {batchItems.filter(i => i.status === 'completed' && i.result).map((item) => (
              <NotificationDisplay 
                key={item.id}
                analysis={item.result!.analysis!} 
                ocrText={item.result!.ocrText}
                onUpdateMatch={(user) => handleManualUpdateMatch(item.id, user)}
                onDelete={() => handleDeleteItem(item.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 歷史紀錄彈窗 */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-black text-gray-800">處理歷史</h2>
              <button onClick={() => setShowHistory(false)} className="bg-gray-100 p-2 rounded-full text-gray-400 hover:text-gray-600 transition-colors">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-hide py-2">
              {ocrHistory.length === 0 ? (
                <div className="py-20 text-center text-gray-400 font-bold">尚無歷史紀錄</div>
              ) : (
                ocrHistory.sort((a,b)=>b.timestamp-a.timestamp).map(item => (
                  <div key={item.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="text-[10px] font-black text-indigo-500 mb-1">{new Date(item.timestamp).toLocaleString()}</div>
                    <div className="text-sm font-black text-gray-800">{item.customerName}</div>
                    <div className="text-[11px] text-gray-500 italic">"{item.action}"</div>
                  </div>
                ))
              )}
            </div>
            <button onClick={() => setShowHistory(false)} className="mt-4 w-full py-4 bg-indigo-50 text-indigo-600 rounded-2xl font-black">關閉</button>
          </div>
        </div>
      )}

      {/* CRM 客戶資料庫彈窗 */}
      {showDb && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-gray-800">CRM 客戶資料庫</h2>
              <button onClick={() => setShowDb(false)} className="bg-gray-100 p-2 rounded-full text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 scrollbar-hide">
              {MOCK_CUSTOMER_DB.map(user => (
                <div key={user.lineUserId} className="flex items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <img src={user.avatar} className="w-10 h-10 rounded-full mr-3 border-2 border-white shadow-sm" alt={user.name} />
                  <div>
                    <div className="font-black text-gray-800 text-sm">{user.name}</div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase">{user.company}</div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setShowDb(false)} className="mt-6 w-full py-4 bg-indigo-50 text-indigo-600 rounded-2xl font-black">關閉</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
