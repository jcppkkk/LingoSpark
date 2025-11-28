import React from 'react';
import * as Sentry from '@sentry/react';
import { Icons } from '../constants';

interface ErrorTestProps {
  onBack: () => void;
}

const ErrorTest: React.FC<ErrorTestProps> = ({ onBack }) => {
// @ARCH: ErrorTest.FEAT.錯誤觸發機制
  const handleThrowError = () => {
    throw new Error('This is your first error!');
  };

  const handleCaptureException = () => {
    try {
      throw new Error('Captured exception test');
    } catch (error) {
      Sentry.captureException(error);
    }
  };

  const handleConsoleError = () => {
    console.error('This is a console.error test message');
  };

  const handleConsoleWarn = () => {
    console.warn('This is a console.warn test message');
  };

  const handleConsoleLog = () => {
    console.log('This is a console.log test message');
  };

  const handleUnhandledPromiseRejection = () => {
    Promise.reject(new Error('Unhandled promise rejection test'));
  };

// @ARCH: ErrorTest.UI.頁面主要佈局
  return (
{/* @ARCH: ErrorTest.UI.頁首區塊 */}
    <div className="h-full flex flex-col p-6 max-w-4xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-red-500 text-white rounded-[1.5rem] shadow-xl transform -rotate-6 border-4 border-white/50">
            <Icons.Flash size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-dark tracking-tight">Sentry 錯誤測試</h1>
            <p className="text-base text-slate-500 font-bold">測試 Sentry 事件接收</p>
          </div>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700 transition-all active:scale-95"
        >
          <Icons.ArrowLeft size={18} />
          <span>返回</span>
        </button>
{/* @ARCH: ErrorTest.UI.測試說明警告橫幅 */}
      </div>

      {/* Warning Banner */}
      <div className="mb-6 bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <Icons.Flash className="text-amber-500 mt-1 flex-shrink-0" size={20} />
          <div>
            <h3 className="font-bold text-amber-700 mb-1">測試說明</h3>
            <p className="text-sm text-amber-600">
              點擊下方按鈕會觸發不同類型的錯誤，這些錯誤應該會被 Sentry 捕獲並發送到 Sentry 儀表板。
              請前往 Sentry 儀表板確認事件是否正常接收。
            </p>
          </div>
{/* @ARCH: ErrorTest.UI.錯誤觸發按鈕網格 */}
        </div>
      </div>

      {/* Test Buttons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
        {/* Throw Error Button */}
        <button
          onClick={handleThrowError}
          className="p-6 rounded-2xl bg-red-500 text-white shadow-lg hover:bg-red-600 transition-all hover:scale-[1.02] border-4 border-transparent hover:border-white/20 flex flex-col items-center justify-center gap-3"
        >
          <Icons.Flash size={32} />
          <span className="font-black text-xl">拋出錯誤</span>
          <span className="text-sm text-red-100">throw new Error()</span>
        </button>

        {/* Capture Exception Button */}
        <button
          onClick={handleCaptureException}
          className="p-6 rounded-2xl bg-orange-500 text-white shadow-lg hover:bg-orange-600 transition-all hover:scale-[1.02] border-4 border-transparent hover:border-white/20 flex flex-col items-center justify-center gap-3"
        >
          <Icons.Flash size={32} />
          <span className="font-black text-xl">捕獲異常</span>
          <span className="text-sm text-orange-100">Sentry.captureException()</span>
        </button>

        {/* Console Error Button */}
        <button
          onClick={handleConsoleError}
          className="p-6 rounded-2xl bg-purple-500 text-white shadow-lg hover:bg-purple-600 transition-all hover:scale-[1.02] border-4 border-transparent hover:border-white/20 flex flex-col items-center justify-center gap-3"
        >
          <Icons.Flash size={32} />
          <span className="font-black text-xl">Console Error</span>
          <span className="text-sm text-purple-100">console.error()</span>
        </button>

        {/* Console Warn Button */}
        <button
          onClick={handleConsoleWarn}
          className="p-6 rounded-2xl bg-yellow-500 text-white shadow-lg hover:bg-yellow-600 transition-all hover:scale-[1.02] border-4 border-transparent hover:border-white/20 flex flex-col items-center justify-center gap-3"
        >
          <Icons.Flash size={32} />
          <span className="font-black text-xl">Console Warn</span>
          <span className="text-sm text-yellow-100">console.warn()</span>
        </button>

        {/* Console Log Button */}
        <button
          onClick={handleConsoleLog}
          className="p-6 rounded-2xl bg-blue-500 text-white shadow-lg hover:bg-blue-600 transition-all hover:scale-[1.02] border-4 border-transparent hover:border-white/20 flex flex-col items-center justify-center gap-3"
        >
          <Icons.Flash size={32} />
          <span className="font-black text-xl">Console Log</span>
          <span className="text-sm text-blue-100">console.log()</span>
        </button>

        {/* Unhandled Promise Rejection Button */}
        <button
          onClick={handleUnhandledPromiseRejection}
          className="p-6 rounded-2xl bg-pink-500 text-white shadow-lg hover:bg-pink-600 transition-all hover:scale-[1.02] border-4 border-transparent hover:border-white/20 flex flex-col items-center justify-center gap-3"
        >
          <Icons.Flash size={32} />
          <span className="font-black text-xl">Promise Rejection</span>
{/* @ARCH: ErrorTest.UI.資訊提示頁腳 */}
          <span className="text-sm text-pink-100">未處理的 Promise 拒絕</span>
        </button>
      </div>

      {/* Info Footer */}
      <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <p className="text-sm text-slate-600 text-center">
          <strong>提示：</strong> 打開瀏覽器開發者工具的 Console 標籤頁可以查看錯誤訊息。
          所有錯誤都應該會自動發送到 Sentry。
        </p>
      </div>
    </div>
  );
};

export default ErrorTest;

