
import React from 'react';

interface ApiKeyCheckerProps {
  onOpenApiKeySelection: () => void;
  error: string | null;
}

const ApiKeyChecker: React.FC<ApiKeyCheckerProps> = ({ onOpenApiKeySelection, error }) => {
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-yellow-50 border border-yellow-200 rounded-lg shadow-md w-full max-w-md text-center">
      <h2 className="text-xl font-bold text-yellow-800 mb-3">⚠️ 需要 API 金鑰</h2>
      <p className="text-gray-700 mb-4">
        為了使用 AI 模型的完整功能，請選擇一個有效的 Google Cloud API 金鑰。
        此應用需要存取 Gemini 模型。
      </p>
      <button
        onClick={onOpenApiKeySelection}
        className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-full shadow-md transition-colors duration-300 mb-4"
      >
        選擇/設定 API 金鑰
      </button>
      <p className="text-sm text-gray-600">
        請確保您的金鑰來自一個已啟用帳單功能的 Google Cloud 專案。
      </p>
      <a
        href="https://ai.google.dev/gemini-api/docs/billing"
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 hover:underline text-sm mt-2"
      >
        了解更多關於帳單資訊
      </a>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative w-full mt-4 text-sm break-words">
          <strong className="font-bold">錯誤！</strong>
          <span className="block sm:inline ml-2">{error}</span>
        </div>
      )}
    </div>
  );
};

export default ApiKeyChecker;
