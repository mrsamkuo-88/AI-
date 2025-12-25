
import React, { useState } from 'react';
import { MatchedUser, MailLogEntry, MailProcessingStatus } from '../types';
import CustomerDashboard from './CustomerDashboard';

interface CustomerManagementProps {
  customers: MatchedUser[];
  logs: MailLogEntry[];
  onUpdate: (customers: MatchedUser[]) => void;
  onProcessMail: (logId: string, status: MailProcessingStatus, isArchived?: boolean) => void;
  onDeleteCustomer: (customerId: string) => void;
}

const TAG_OPTIONS = ['Basic', 'MVP', 'VIP'];
const VENUE_OPTIONS = ['四維館', '民權館'];
const PRODUCT_CATEGORY_OPTIONS = ['工商登記', '辦公室'];

const CustomerManagement: React.FC<CustomerManagementProps> = ({ customers, logs, onUpdate, onProcessMail, onDeleteCustomer }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTagFilters, setActiveTagFilters] = useState<string[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<MatchedUser | null>(null);
  const [newCustomer, setNewCustomer] = useState<Partial<MatchedUser>>({
    customerId: '',
    name: '',
    company: '',
    phone: '',
    address: '',
    email: '',
    scanEmail: '',
    preferredFloor: '21樓櫃檯',
    tags: ['Basic'],
    productCategory: '工商登記',
    venue: '民權館',
    freeScans: 0,
    scanFee: 0,
    freeDeliveries: 0,
    deliveryFee: 0
  });

  const setTagWithDefaults = (tag: string) => {
    let defaults = { tags: [tag], freeScans: 0, scanFee: 0, freeDeliveries: 0, deliveryFee: 0 };
    if (tag === 'MVP') {
      defaults = { ...defaults, freeScans: 3, scanFee: 30, freeDeliveries: 1, deliveryFee: 30 };
    } else if (tag === 'VIP') {
      defaults = { ...defaults, freeScans: 10, scanFee: 30, freeDeliveries: 3, deliveryFee: 30 };
    }
    setNewCustomer({ ...newCustomer, ...defaults });
  };

  const handleAdd = () => {
    if (!newCustomer.customerId || !newCustomer.name) return alert('取信編號與姓名為必填');
    
    const user: MatchedUser = {
      customerId: newCustomer.customerId!,
      name: newCustomer.name!,
      company: newCustomer.company || '個人戶',
      phone: newCustomer.phone || '',
      address: newCustomer.address || '',
      email: newCustomer.email || '',
      scanEmail: newCustomer.scanEmail || '',
      preferredFloor: newCustomer.preferredFloor || '21樓櫃檯',
      lineUserId: 'MANUAL_' + Date.now(),
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${newCustomer.name}`,
      status: 'matched',
      confidence: 1,
      isLinked: false,
      processingPrinciple: '',
      tags: newCustomer.tags || ['Basic'],
      productCategory: newCustomer.productCategory || '工商登記',
      venue: newCustomer.venue || '民權館',
      freeScans: newCustomer.freeScans || 0,
      scanFee: newCustomer.scanFee || 0,
      freeDeliveries: newCustomer.freeDeliveries || 0,
      deliveryFee: newCustomer.deliveryFee || 0
    };

    onUpdate([user, ...customers]);
    setSelectedCustomer(user);
    setNewCustomer({ customerId: '', name: '', company: '', phone: '', address: '', email: '', scanEmail: '', preferredFloor: '21樓櫃檯', tags: ['Basic'], productCategory: '工商登記', venue: '民權館', freeScans: 0, scanFee: 0, freeDeliveries: 0, deliveryFee: 0 });
    setIsAdding(false);
  };

  const handleUpdateCustomer = (updatedUser: MatchedUser) => {
    const updated = customers.map(c => 
      c.customerId === updatedUser.customerId ? updatedUser : c
    );
    onUpdate(updated);
    setSelectedCustomer(updatedUser);
  };

  const getTagStyle = (tag: string) => {
    switch (tag) {
      case 'VIP': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'MVP': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const toggleTagFilter = (tag: string) => {
    setActiveTagFilters(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const filtered = customers.filter(c => {
    const matchesSearch = c.name.includes(searchTerm) || 
                          c.company.includes(searchTerm) || 
                          c.customerId.includes(searchTerm);
    // OR logic: match ANY of the selected filters
    const matchesTag = activeTagFilters.length > 0 
      ? c.tags?.some(tag => activeTagFilters.includes(tag)) 
      : true;
    return matchesSearch && matchesTag;
  });

  const getHistoryCount = (customerId: string) => {
    return logs.filter(l => l.analysis.matchedUser?.customerId === customerId && l.isArchived).length;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {selectedCustomer && (
        <CustomerDashboard 
          customer={selectedCustomer}
          logs={logs}
          onUpdateCustomer={handleUpdateCustomer}
          onDeleteCustomer={onDeleteCustomer}
          onProcessMail={onProcessMail}
          onClose={() => setSelectedCustomer(null)}
        />
      )}

      <div className="flex justify-between items-center bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-gray-800">取信編號資料庫</h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Customer ID Database</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className={`px-6 py-3 rounded-2xl font-black text-xs transition-all ${isAdding ? 'bg-gray-100 text-gray-500' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'}`}
        >
          {isAdding ? '取消' : '＋ 建立新客戶檔案'}
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-8 rounded-[40px] border-2 border-indigo-100 shadow-xl space-y-6 animate-in slide-in-from-top-4 overflow-hidden">
          <h3 className="text-sm font-black text-indigo-600 mb-2 uppercase tracking-widest">建立客戶基本與分層資訊</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 ml-2 uppercase">取信編號 (必填)</label>
              <input 
                placeholder="例如: 85"
                className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm shadow-inner"
                value={newCustomer.customerId}
                onChange={e => setNewCustomer({...newCustomer, customerId: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 ml-2 uppercase">客戶姓名 (必填)</label>
              <input 
                placeholder="例如: 鄭月娥"
                className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm shadow-inner"
                value={newCustomer.name}
                onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 ml-2 uppercase">會員分層標籤 (將自動帶入預設額度)</label>
            <div className="flex gap-2">
              {TAG_OPTIONS.map(tag => (
                <button
                  key={tag}
                  onClick={() => setTagWithDefaults(tag)}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all border-2 ${newCustomer.tags?.includes(tag) ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-gray-100 text-gray-400'}`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 ml-2 uppercase">館別</label>
            <div className="flex gap-2">
              {VENUE_OPTIONS.map(opt => (
                <button
                  key={opt}
                  onClick={() => setNewCustomer({...newCustomer, venue: opt})}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all border-2 ${newCustomer.venue === opt ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-gray-100 text-gray-400'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 ml-2 uppercase">產品類別</label>
            <div className="flex gap-2">
              {PRODUCT_CATEGORY_OPTIONS.map(opt => (
                <button
                  key={opt}
                  onClick={() => setNewCustomer({...newCustomer, productCategory: opt})}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all border-2 ${newCustomer.productCategory === opt ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-gray-100 text-gray-400'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 ml-2 uppercase">放置樓層偏好</label>
              <input 
                placeholder="例如: 1樓大廳、21樓櫃檯"
                className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm shadow-inner"
                value={newCustomer.preferredFloor}
                onChange={e => setNewCustomer({...newCustomer, preferredFloor: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 ml-2 uppercase">公司名稱</label>
              <input 
                placeholder="公司名稱..."
                className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm shadow-inner"
                value={newCustomer.company}
                onChange={e => setNewCustomer({...newCustomer, company: e.target.value})}
              />
            </div>
          </div>

          <button 
            onClick={handleAdd}
            className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-sm shadow-xl hover:bg-indigo-700 transition-all"
          >
            💾 儲存並建立客戶分層檔案
          </button>
        </div>
      )}

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 bg-gray-50 border-b flex flex-col sm:flex-row gap-4">
          <div className="flex items-center space-x-3 flex-1 bg-white px-4 py-2 rounded-xl shadow-inner border border-gray-100">
            <span className="text-xl">🔍</span>
            <input 
              className="bg-transparent border-none outline-none w-full font-bold text-sm text-gray-700 placeholder-gray-300"
              placeholder="搜尋編號、公司或姓名..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {TAG_OPTIONS.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTagFilter(tag)}
                className={`px-3 py-2 rounded-lg text-[9px] font-black transition-all border ${activeTagFilters.includes(tag) ? 'bg-indigo-600 text-white border-transparent shadow-sm' : 'bg-white text-gray-400 border-gray-100'}`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
        
        <div className="divide-y divide-gray-50">
          {filtered.map(c => {
            const hCount = getHistoryCount(c.customerId);
            return (
              <div 
                key={c.customerId} 
                onClick={() => setSelectedCustomer(c)}
                className="p-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors group cursor-pointer"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-sm shadow-inner relative">
                    {c.productCategory === '工商登記' ? '#' : ''}{c.customerId}
                    {c.tags?.includes('VIP') && <div className="absolute -top-1 -right-1 text-[10px]">👑</div>}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-black text-gray-800">{c.name}</p>
                      {c.tags?.map(tag => (
                        <span key={tag} className={`px-2 py-0.5 rounded-md text-[8px] font-black border uppercase tracking-widest ${getTagStyle(tag)}`}>
                          {tag}
                        </span>
                      ))}
                      {c.venue && (
                        <span className="px-2 py-0.5 rounded-md text-[8px] font-black bg-indigo-50 text-indigo-600 border border-indigo-100 uppercase tracking-widest">
                          🏛️ {c.venue}
                        </span>
                      )}
                      {c.productCategory && (
                        <span className="px-2 py-0.5 rounded-md text-[8px] font-black bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-widest">
                          {c.productCategory}
                        </span>
                      )}
                      {hCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md text-[8px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-widest">
                          📜 郵務歷史 {hCount}
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                      {c.company || '個人'} {c.preferredFloor && `• 📍 ${c.preferredFloor}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">開啟客戶面板 →</span>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="p-20 text-center text-gray-300 font-black text-sm uppercase tracking-widest">
              找不到符合標籤或搜尋條件的客戶
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerManagement;
