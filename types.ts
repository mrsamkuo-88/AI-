
export interface MatchedUser {
  lineUserId: string;
  name: string;
  company: string; 
  avatar: string;
  status: 'matched' | 'not_found';
  confidence: number; 
  isLinked: boolean;
  lastContact?: string;
}

export interface CustomerMailAnalysis {
  customerName: string; // Recipient identified
  senderName?: string; // New: Extracted sender name
  senderAddress?: string; // New: Extracted sender address or company
  companyName?: string; 
  customerEmail?: string;
  requestedAction: string;
  summary: string;
  isUrgent: boolean;
  mailCategory: 'normal' | 'spam';
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
