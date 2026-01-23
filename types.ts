
export interface MatchedUser {
  customerId: string; // 取信編號
  lineUserId: string;
  name: string;
  company: string; 
  avatar: string;
  status: 'matched' | 'not_found';
  confidence: number; 
  isLinked: boolean;
  lastContact?: string;
  note?: string; // 客戶備註
  processingPrinciple?: string; // 基本處置原則
  tags?: string[]; // 新增：分層標籤 (Basic, MVP, VIP)
  productCategory?: string; // 新增：產品類別 (工商登記、辦公室)
  venue?: string; // 新增：館別 (四維館、民權館)
  preferredFloor?: string; // 新增：放置樓層偏好 (如: 1樓大廳、21樓櫃檯)
  // 新增聯繫資訊
  phone?: string; 
  address?: string; 
  email?: string; 
  scanEmail?: string; 
  // 新增額度與費用資訊
  freeScans?: number;
  freeDeliveries?: number;
  scanFee?: number;
  deliveryFee?: number;
  unpaidFees?: number; // 新增：待結清金額
}

export interface CustomerMailAnalysis {
  customerName: string;
  senderName?: string;
  senderAddress?: string;
  companyName?: string; 
  requestedAction: string;
  summary: string;
  isUrgent: boolean;
  mailCategory: 'normal' | 'spam';
  suggestedReply: string;
  matchedUser?: MatchedUser;
}

export interface GeminiServiceResponse {
  ocrText: string;
  analysis: CustomerMailAnalysis | null;
}

export type MailProcessingStatus = 
  | 'pending' 
  | 'notified' 
  | 'scanned' 
  | 'discarded' 
  | 'scheduled' 
  | 'at_counter' 
  | 'move_to_1f'
  | 'at_counter_12' // 新增：12樓櫃台狀態
  | 'at_counter_27'; // 新增：27樓櫃台狀態

export interface MailLogEntry {
  id: string;
  timestamp: string; // 收到(掃描)時間
  processedAt?: string; // 實際處理(歸檔)時間
  analysis: CustomerMailAnalysis;
  imageUrl?: string;
  fileName?: string; 
  isNotified: boolean;
  processingStatus?: MailProcessingStatus;
  isArchived?: boolean; 
}

export interface ScheduledMail {
  id: string;
  logId: string;
  customerId: string;
  customerName: string;
  company: string;
  senderName: string;
  timestamp: string;
  isProcessed: boolean;
}
