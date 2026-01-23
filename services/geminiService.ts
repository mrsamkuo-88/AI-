
import { GoogleGenAI, Type } from "@google/genai";
import { GeminiServiceResponse, MatchedUser, MailTemplate } from "../types";
import { GEMINI_MODEL, MOCK_CUSTOMER_DB } from "../constants";

export async function processImageForMail(
  base64Image: string,
  mimeType: string,
  venueInfo: { name: string; floor: string },
  templates: MailTemplate[]
): Promise<GeminiServiceResponse> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // 將模板格式化為 AI 容易理解的指令
  const templateInstructions = templates.map(t => 
    `等級 ${t.id} 的格式：\n${t.content}`
  ).join('\n\n');

  const systemInstruction = `你是一位專業的 AI 郵務秘書，服務於「道騰DT Space」。
你的任務是從郵件照片中提取資訊，並根據收件人的等級選擇正確的模板生成 LINE 通知。

【可用模板與變數說明】
系統提供以下模板，其中的 {{變數}} 必須被實際內容替換：
${templateInstructions}

【操作規則】
1. 提取收件人姓名、公司、寄件者、郵件類型（信件/包裹/重要文件）。
2. 如果找到匹配客戶，根據其標籤（VIP/MVP/Basic）套用對應模板。
3. 替換模板中的所有變數。
4. 輸出必須為繁體中文 JSON。
5. 語氣必須溫和、專業。`;

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
          { text: `辨識照片中的收件人。館別：${venueInfo.name}，預設放置：${venueInfo.floor}。` }
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
    
    // 客戶自動匹配 logic (維持原有機制)
    const DB_KEY = 'AI_MAIL_ASSISTANT_CRM_V5';
    const savedCustomers = localStorage.getItem(DB_KEY);
    const activeDb = savedCustomers ? JSON.parse(savedCustomers) : MOCK_CUSTOMER_DB;

    const rawName = result.analysis.customerName || "";
    let bestMatch = activeDb.find((c: MatchedUser) => 
      rawName.includes(c.name) || c.name.includes(rawName) || (c.company && rawName.includes(c.company))
    );

    if (bestMatch) {
      result.analysis.matchedUser = { ...bestMatch, status: 'matched', confidence: 0.95 };
      // 二次替換（防止 AI 漏掉變數）
      result.analysis.suggestedReply = result.analysis.suggestedReply
        .replace(/{{取信編號}}/g, bestMatch.customerId)
        .replace(/{{客戶姓名}}/g, bestMatch.name)
        .replace(/{{公司名稱}}/g, bestMatch.company)
        .replace(/{{放置地點}}/g, bestMatch.preferredFloor || venueInfo.floor)
        .replace(/{{寄件單位}}/g, result.analysis.senderName || "未知單位");
    } else {
      result.analysis.matchedUser = {
        customerId: '待查', lineUserId: '', name: rawName, company: '', avatar: '', status: 'not_found', confidence: 0, isLinked: false
      };
      // 套用未知收件人模板
      const unknownTpl = templates.find(t => t.id === 'Unknown') || templates[0];
      result.analysis.suggestedReply = unknownTpl.content
        .replace(/{{客戶姓名}}/g, rawName)
        .replace(/{{放置地點}}/g, venueInfo.floor)
        .replace(/{{郵件類型}}/g, result.analysis.summary || "郵件");
    }

    return result as GeminiServiceResponse;
  } catch (error: any) {
    console.error("Gemini OCR Error:", error);
    throw new Error("辨識引擎暫時無法服務。");
  }
}
