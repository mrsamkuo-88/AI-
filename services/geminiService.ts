
import { GoogleGenAI, Type } from "@google/genai";
import { GeminiServiceResponse, MatchedUser } from "../types";
import { GEMINI_MODEL, MOCK_CUSTOMER_DB } from "../constants";

function calculateSimilarity(s1: string, s2: string): number {
  if (!s1 || !s2) return 0;
  const str1 = s1.toLowerCase().trim();
  const str2 = s2.toLowerCase().trim();
  if (str1 === str2) return 1.0;
  if (str1.includes(str2) || str2.includes(str1)) return 0.9;
  return 0;
}

export async function processImageForMail(
  base64Image: string,
  mimeType: string,
  venueInfo: { name: string; floor: string }
): Promise<GeminiServiceResponse> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const systemInstruction = `你是一位專業的 AI 郵務秘書，服務於「道騰DT Space」。
你的任務是從郵件照片中提取資訊，並生成符合道騰品牌標準的專業 LINE 通知。

【訊息生成規範】
1. 格式必須完全按照以下結構：
   [客戶姓名] 先生/小姐您好 👋，

   這裡有一封您的重要郵件通知 📩。這封信件來自「[寄件單位]」，信封上標註為 [信件特性，如：重要文件/限時掛號]。由於 [說明原因，如：內容涉及個人隱私]，建議您儘速撥冗領取。若有疑問可洽詢 [寄件電話/資訊]。

   今日信件，幫您放置 『[放置地點]』。

   您的取信編號【#[取信編號]】
   再麻煩您到 『[放置地點]』 時，跟櫃台人員說編號取信，道騰致力提供最專業的服務給您。

   ---
   💡 如不便前來，我們也提供以下專業服務：
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
          suggestedReply: { type: Type.STRING, description: "Formatted professional LINE message with [取信編號] and [放置地點] placeholders" },
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
          { text: `辨識郵件並生成 LINE 通知。館別為：${venueInfo.name}。` }
        ]
      },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.2,
      },
    });

    const result = JSON.parse(response.text.trim());
    
    const DB_KEY = 'AI_MAIL_ASSISTANT_CRM_V5';
    const savedCustomers = localStorage.getItem(DB_KEY);
    const activeDb = savedCustomers ? JSON.parse(savedCustomers) : MOCK_CUSTOMER_DB;

    const rawName = result.analysis.customerName || "";
    let bestMatch = activeDb.find((c: MatchedUser) => calculateSimilarity(rawName, c.name) > 0.8);

    if (bestMatch) {
      result.analysis.matchedUser = { ...bestMatch, status: 'matched', confidence: 0.95 };
      // 替換文案中的 [取信編號] 預留位置
      result.analysis.suggestedReply = result.analysis.suggestedReply.replace(/\[取信編號\]/g, bestMatch.customerId);
      // 預設先替換為客戶偏好或館別預設 (在 NotificationDisplay 會根據實際匹配再校正一次)
      const finalFloor = bestMatch.preferredFloor || venueInfo.floor;
      result.analysis.suggestedReply = result.analysis.suggestedReply.replace(/\[放置地點\]/g, finalFloor);
    } else {
      result.analysis.matchedUser = {
        customerId: '待定', lineUserId: '', name: rawName, company: '', avatar: '', status: 'not_found', confidence: 0, isLinked: false
      };
      result.analysis.suggestedReply = result.analysis.suggestedReply.replace(/\[取信編號\]/g, '??');
      result.analysis.suggestedReply = result.analysis.suggestedReply.replace(/\[放置地點\]/g, venueInfo.floor);
    }

    return result as GeminiServiceResponse;
  } catch (error: any) {
    throw new Error(`AI 分析失敗: ${error.message}`);
  }
}
