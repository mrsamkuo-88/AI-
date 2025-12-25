
export const GEMINI_MODEL = 'gemini-3-flash-preview';
export const LIFF_ID: string = "2008738915-Gme20DzS"; 

export const MOCK_CUSTOMER_DB = [
  { 
    customerId: '2021',
    name: 'Sam', 
    company: '道騰企業', 
    lineUserId: 'U_SAM_1', 
    isLinked: true,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sam',
    status: 'matched' as const,
    confidence: 1.0,
    phone: '0900-000-000',
    address: '台北市某區某路',
    email: 'sam@example.com',
    scanEmail: 'scan+sam@example.com',
    tags: ['VIP'],
    venue: '民權館',
    productCategory: '辦公室',
    preferredFloor: '21樓櫃檯',
    freeScans: 10,
    scanFee: 30,
    freeDeliveries: 3,
    deliveryFee: 30
  },
  { 
    customerId: '85',
    name: '鄭月娥', 
    company: '雲諾青騏耀斯映', 
    lineUserId: 'U1234567890abcdef', 
    isLinked: true,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    status: 'matched' as const,
    confidence: 1.0,
    phone: '0912-345-678',
    address: '台北市信義區忠孝東路五段1號',
    email: 'moon.cheng@example.com',
    scanEmail: 'scan+moon@example.com',
    tags: ['VIP'],
    venue: '民權館',
    productCategory: '工商登記',
    preferredFloor: '27樓櫃檯',
    freeScans: 10,
    scanFee: 30,
    freeDeliveries: 3,
    deliveryFee: 30
  },
  { 
    customerId: '102',
    name: '王大明', 
    company: '大明創意有限公司', 
    lineUserId: 'U_MOCK_2', 
    isLinked: true,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anya',
    status: 'matched' as const,
    confidence: 1.0,
    phone: '0988-777-666',
    address: '台中市西屯區台灣大道三段99號',
    email: 'daming@creativity.tw',
    scanEmail: 'scan+daming@creativity.tw',
    tags: ['MVP'],
    venue: '四維館',
    productCategory: '辦公室',
    preferredFloor: '1樓大廳',
    freeScans: 3,
    scanFee: 30,
    freeDeliveries: 1,
    deliveryFee: 30
  }
];

export const APP_VERSION = "5.9.6-ULTRA-SYNC-FINAL";
