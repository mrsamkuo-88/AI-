
import { MailTemplate } from "./types";

export const GEMINI_MODEL = 'gemini-3-flash-preview';
export const LIFF_ID: string = "2008738915-Gme20DzS"; 

export const DEFAULT_TEMPLATES: MailTemplate[] = [
  {
    id: 'Basic',
    name: '一般會員模板',
    content: `{{客戶姓名}} 您好 👋，

這裡有一件您的「{{郵件類型}}」已送達 📩。
我們已將您的郵件放置於 {{放置地點}}，方便您隨時前來領取。
您的取信編號【#{{取信編號}}】

祝您有個美好的一天！✨
✨ 道騰 DT Space 智能郵務管家 敬上`
  },
  {
    id: 'MVP',
    name: 'MVP 會員模板',
    content: `道騰傑出 MVP {{客戶姓名}} 您好 ✨，

這裡有一件您的「{{郵件類型}}」已送達 📩。
我們已將您的郵件放置於 {{放置地點}}。
您的取信編號【#{{取信編號}}】

💡 如您不便親自前來，我們提供以下服務：
1️⃣ 郵件掃描電子檔 (E-mail傳送)
2️⃣ 碎紙銷毀處理
請直接回覆此訊息告知需求。

✨ 道騰 DT Space 智能郵務管家 敬上`
  },
  {
    id: 'VIP',
    name: 'VIP 尊榮模板',
    content: `親愛的道騰尊榮 VIP {{客戶姓名}} 您好 👑，

這裡有一件您的「{{郵件類型}}」已送達 📩。來自「{{寄件單位}}」。
我們已將其妥善放置於 {{放置地點}}。
您的取信編號【#{{取信編號}}】

💡 作為 VIP 會員，您可以隨時指示我們：
① 協助移置至一樓信件自取區
② 優先開封掃描並電子郵寄給您
③ 月底彙總寄送

祝您順心！✨
✨ 道騰 DT Space 尊榮服務團隊 敬上`
  },
  {
    id: 'Unknown',
    name: '未知收件人模板',
    content: `您好 👋，

偵測到一封發往您公司的郵件 📩。
收件人：{{客戶姓名}}
目前放置於：{{放置地點}}

請確認是否為您的郵件，謝謝！`
  }
];

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
  }
];

export const APP_VERSION = "6.1.5-TEMPLATE";
