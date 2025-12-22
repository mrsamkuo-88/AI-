
export interface MatchedUser {
  lineUserId: string;
  name: string;
  company?: string; 
  avatar: string;
  status: 'matched' | 'not_found';
  confidence: number; 
}

export interface CustomerMailAnalysis {
  customerName: string;
  companyName?: string; 
  customerEmail?: string;
  requestedAction: string;
  summary: string;
  isUrgent: boolean;
  mailCategory: 'normal' | 'spam'; // 新增信件類別
  matchedUser?: MatchedUser;
}

export interface GeminiServiceResponse {
  ocrText: string;
  analysis: CustomerMailAnalysis | null;
}

export interface OCRHistoryItem {
  id: string;
  timestamp: number;
  fileName: string;
  customerName: string;
  action: string;
  isUrgent: boolean;
  category: 'normal' | 'spam';
}
