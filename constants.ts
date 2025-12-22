
export const GEMINI_MODEL = 'gemini-flash-lite-latest';

/** 
 * LINE LIFF ID 配置
 * 已更新為用戶提供的 ID: 2008738915-Gme20DzS
 */
export const LIFF_ID: string = "2008738915-Gme20DzS"; 

// 模擬真實資料庫 (CRM + LINE Mapping)
export const MOCK_CUSTOMER_DB = [
  { 
    name: '王大明', 
    company: '大明創意有限公司', 
    lineUserId: 'U1234567890abcdef', 
    isLinked: true,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    lastContact: '2024-03-20'
  },
  { 
    name: '陳小美', 
    company: '美美工作室', 
    lineUserId: 'U0987654321fedcba', 
    isLinked: true,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anya',
    lastContact: '2024-03-22'
  },
  { 
    name: '李四', 
    company: '全方位物流', 
    lineUserId: 'U1122334455aabbcc', 
    isLinked: false,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack',
    lastContact: '2024-01-15'
  }
];

export const PROCESSING_MESSAGE = '正在使用 Gemini Flash Lite 進行極速分析...';
