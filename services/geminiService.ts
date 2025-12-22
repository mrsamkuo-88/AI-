
import { GoogleGenAI, Type } from "@google/genai";
import { CustomerMailAnalysis, GeminiServiceResponse, MatchedUser } from "../types";
import { GEMINI_MODEL, MOCK_CUSTOMER_DB } from "../constants";

/**
 * 計算字串相似度
 */
function calculateSimilarity(s1: string, s2: string): number {
  if (!s1 || !s2) return 0;
  const str1 = s1.toLowerCase().trim();
  const str2 = s2.toLowerCase().trim();
  if (str1 === str2) return 1.0;
  if (str1.includes(str2) || str2.includes(str1)) return 0.9;
  return 0;
}

/**
 * 處理郵件圖片 - 極速優化版 + 類別辨識
 */
export async function processImageForMail(
  base64Image: string,
  mimeType: string
): Promise<GeminiServiceResponse> {
  // CRITICAL: 每次呼叫時重新建立實例以獲取最新的 API Key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // 系統指令：極簡化，並強制繁體中文
  const systemInstruction = "OCR & JSON. Extract: customerName, companyName, requestedAction, isUrgent(bool). mailCategory: 'normal' OR 'spam'. Use Traditional Chinese for 'summary' and 'requestedAction'. Be concise.";

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      ocrText: { type: Type.STRING },
      analysis: {
        type: Type.OBJECT,
        properties: {
          customerName: { type: Type.STRING },
          companyName: { type: Type.STRING },
          requestedAction: { type: Type.STRING },
          summary: { type: Type.STRING },
          isUrgent: { type: Type.BOOLEAN },
          mailCategory: { type: Type.STRING, description: "Classification: 'normal' or 'spam'" },
        },
        required: ['customerName', 'requestedAction', 'isUrgent', 'mailCategory'],
      },
    },
    required: ['ocrText', 'analysis'],
  };

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: {
        parts: [{ inlineData: { mimeType, data: base64Image } }, { text: "Output JSON only." }]
      },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0, // 設為 0 以獲得最穩定的結果與最快回應速度
        maxOutputTokens: 800, // 限制輸出長度，避免冗餘生成，提升處理效率
        thinkingConfig: { thinkingBudget: 0 }, // 強制關閉思考模式，移除推理延遲，適合純 OCR 任務
      },
    });

    // 直接存取 .text 屬性（非函式呼叫）
    const textOutput = response.text || "{}";
    const result = JSON.parse(textOutput.trim());
    
    // 快速 CRM 匹配 (僅在正常信件時進行強化匹配)
    const rawName = result.analysis.customerName || "";
    const rawCompany = result.analysis.companyName || "";
    let bestMatch = MOCK_CUSTOMER_DB.find(c => 
      calculateSimilarity(rawName, c.name) > 0.8 || 
      calculateSimilarity(rawCompany, c.company) > 0.8
    );

    result.analysis.matchedUser = bestMatch ? {
      ...bestMatch,
      status: 'matched',
      confidence: 0.95
    } : {
      lineUserId: '',
      name: rawName || '未知',
      company: rawCompany,
      avatar: '',
      status: 'not_found',
      confidence: 0
    };

    return result as GeminiServiceResponse;
  } catch (error: any) {
    throw new Error(`Speed Analysis Failed: ${error.message}`);
  }
}
