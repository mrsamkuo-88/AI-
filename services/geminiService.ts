
import { GoogleGenAI, Type } from "@google/genai";
import { GeminiServiceResponse, MatchedUser } from "../types";
import { GEMINI_MODEL, MOCK_CUSTOMER_DB } from "../constants";

/**
 * 核心辨識邏輯：不要求使用者選取 Key，直接使用後端配置
 */
export async function processImageForMail(
  base64Image: string,
  mimeType: string,
  venueInfo: { name: string; floor: string }
): Promise<GeminiServiceResponse> {
  // 嚴格遵守規範：直接使用系統注入的 API_KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const systemInstruction = `你是一位專業的 AI 郵務秘書，服務於「道騰DT Space」。
你的任務是從郵件照片中提取資訊，並生成符合道騰品牌標準的專業 LINE 通知。

【訊息生成規範】
1. 格式必須完全按照以下結構：
   [客戶姓名] 先生/小姐您好 👋，

   這裡有一封您的重要郵件通知 📩。這封信件來自「[寄件單位]」，信封上標註為 [重要文件/一般郵件]。

   今日信件，幫您放置 『[放置地點]』。

   您的取信編號【#[取信編號]】
   再麻煩您到 『[放置地點]』 時，跟櫃台人員說編號取信。

   ---
   💡 如不便前來，我們也提供以下服務：
   1️⃣ 郵件掃描電子檔 (E-mail傳送)
   2️⃣ 郵件直接丟棄 (碎紙處理)
   3️⃣ 月底統一彙總寄送 (運費另計)
   請直接回覆此訊息告知您的需求。

   祝您有個美好的一天！
   ✨ 道騰DT Space 智能郵務管家 敬上

2. 輸出必須為繁體中文 JSON。
3. 語氣必須溫和、專業。`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      ocrText: { type: Type.STRING },
      analysis: {
        type: Type.OBJECT,
        properties: {
          customerName: { type: Type.STRING },
          senderName: { type: Type.STRING },
          senderAddress: { type: Type.STRING },
          requestedAction: { type: Type.STRING },
          summary: { type: Type.STRING },
          isUrgent: { type: Type.BOOLEAN },
          suggestedReply: { type: Type.STRING },
        },
        required: ['customerName', 'senderName', 'requestedAction', 'isUrgent', 'suggestedReply'],
      },
    },
    required: ['ocrText', 'analysis'],
  };

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Image } },
          { text: `辨識照片中的收件人與寄件者。館別：${venueInfo.name}，預設放置：${venueInfo.floor}。` }
        ]
      },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.1,
      },
    });

    const result = JSON.parse(response.text.trim());
    
    // 客戶自動匹配 logic
    const DB_KEY = 'AI_MAIL_ASSISTANT_CRM_V5';
    const savedCustomers = localStorage.getItem(DB_KEY);
    const activeDb = savedCustomers ? JSON.parse(savedCustomers) : MOCK_CUSTOMER_DB;

    const rawName = result.analysis.customerName || "";
    // 簡易名稱模糊比對
    let bestMatch = activeDb.find((c: MatchedUser) => 
      rawName.includes(c.name) || c.name.includes(rawName) || (c.company && rawName.includes(c.company))
    );

    if (bestMatch) {
      result.analysis.matchedUser = { ...bestMatch, status: 'matched', confidence: 0.95 };
      result.analysis.suggestedReply = result.analysis.suggestedReply
        .replace(/\[取信編號\]/g, bestMatch.customerId)
        .replace(/\[客戶姓名\]/g, bestMatch.name)
        .replace(/\[放置地點\]/g, bestMatch.preferredFloor || venueInfo.floor);
    } else {
      result.analysis.matchedUser = {
        customerId: '待查', lineUserId: '', name: rawName, company: '', avatar: '', status: 'not_found', confidence: 0, isLinked: false
      };
      result.analysis.suggestedReply = result.analysis.suggestedReply
        .replace(/\[取信編號\]/g, '??')
        .replace(/\[客戶姓名\]/g, rawName)
        .replace(/\[放置地點\]/g, venueInfo.floor);
    }

    return result as GeminiServiceResponse;
  } catch (error: any) {
    console.error("Gemini OCR Error:", error);
    throw new Error("辨識引擎暫時無法服務，請確認網路連線或稍後再試。");
  }
}
