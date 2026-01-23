
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
  note?: string; 
  processingPrinciple?: string; 
  tags?: string[]; 
  productCategory?: string; 
  venue?: string; 
  preferredFloor?: string; 
  phone?: string; 
  address?: string; 
  email?: string; 
  scanEmail?: string; 
  freeScans?: number;
  freeDeliveries?: number;
  scanFee?: number;
  deliveryFee?: number;
  unpaidFees?: number; 
}

export interface MailTemplate {
  id: 'Basic' | 'MVP' | 'VIP' | 'Unknown';
  name: string;
  content: string;
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
  | 'at_counter_12' 
  | 'at_counter_27';

export interface MailLogEntry {
  id: string;
  timestamp: string; 
  processedAt?: string; 
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
