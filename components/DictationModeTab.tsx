import React, { useState, useEffect, useRef } from 'react';
import { Flashcard } from '../types';
import { speakWord } from '../services/speechService';
import { playCorrectSound } from '../services/soundService';

interface DictationModeTabProps {
  card: Flashcard;
  voice: SpeechSynthesisVoice | null;
  onNext: () => void;
  onPrevious: () => void;
  currentIndex: number;
  totalCards: number;
}

// @ARCH:START DictationModeTab - UI: 聽寫模式
const DictationModeTab: React.FC<DictationModeTabProps> = ({
  card,
  voice,
  onNext,
  onPrevious,
  currentIndex,
  totalCards
}) => {
// @ARCH: DictationModeTab.UX.組件狀態管理
  const [userInput, setUserInput] = useState('');
  const [isChecked, setIsChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { word, definition } = card.data;
  
  // 用於追蹤是否已經播放過
  const lastWordRef = useRef<string>('');

// @ARCH: DictationModeTab.UX.卡片切換重置狀態與聚焦
  // 當卡片改變時重置狀態
  useEffect(() => {
    setUserInput('');
    setIsChecked(false);
    setIsCorrect(false);
    // 自動聚焦輸入框
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, [word, currentIndex]);
  
  // @ARCH: DictationModeTab - FEAT: 自動播放單字
  // 當卡片改變時，自動播放單字
  useEffect(() => {
    if (word !== lastWordRef.current) {
      lastWordRef.current = word;
      // 延遲一點播放，確保組件載入完成
      const timer = setTimeout(() => {
        speakWord(word, voice || undefined).catch(error => {
          console.error('自動播放單字失敗:', error);
        });
      }, 500); // 等待組件載入
      
      return () => clearTimeout(timer);
    }
// @ARCH: DictationModeTab.FEAT.答案檢查與反饋
  }, [word, voice, currentIndex]);

  const handleCheck = () => {
    if (!userInput.trim()) return;
    
    setIsChecked(true);
    const isAnswerCorrect = userInput.trim().toLowerCase() === word.toLowerCase();
    setIsCorrect(isAnswerCorrect);
    
    // 答對時播放音效
    if (isAnswerCorrect) {
      playCorrectSound();
// @ARCH: DictationModeTab.UX.重置輸入與狀態
    }
  };

  const handleReset = () => {
    setUserInput('');
    setIsChecked(false);
    setIsCorrect(false);
    setTimeout(() => {
// @ARCH: DictationModeTab.FEAT.手動播放單字語音
      inputRef.current?.focus();
    }, 100);
  };

  const handleSpeak = async () => {
    if (isSpeaking) return;
    setIsSpeaking(true);
    try {
      await speakWord(word, voice || undefined);
    } catch (error) {
      console.error('語音播放失敗:', error);
// @ARCH: DictationModeTab.UX.鍵盤 Enter 鍵答案檢查
    } finally {
      setIsSpeaking(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isChecked) {
      handleCheck();
// @ARCH: DictationModeTab.UI.卡片進度指示
    }
  };

  return (
    <div className="flex flex-col h-full items-center justify-center p-4 md:p-8">
      {/* @ARCH: DictationModeTab.UI.單字定義與語音播放區 */}
      {/* 進度指示 */}
      <div className="mb-4 text-sm font-bold text-slate-500">
        {currentIndex + 1} / {totalCards}
      </div>

      {/* 中文提示 */}
      <div className="text-center mb-8">
        <div className="text-4xl md:text-5xl font-black text-green-600 mb-4">
          {definition}
        </div>
        
        {/* 語音按鈕 */}
        <button
          onClick={handleSpeak}
// @ARCH: DictationModeTab.UI.聽寫單字輸入框
          disabled={isSpeaking}
          className="w-16 h-16 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-white text-3xl shadow-lg hover:scale-110 active:scale-95 transition-all disabled:opacity-50 mb-4"
        >
          🔊
        </button>
      </div>

      {/* 輸入框 */}
      <div className="w-full max-w-2xl mb-8">
        <div className="text-2xl font-bold text-slate-600 mb-4 text-center">
          請輸入你聽到的單字：
        </div>
        <input
          ref={inputRef}
          type="text"
          value={userInput}
          onChange={(e) => {
            setUserInput(e.target.value);
            if (isChecked) {
              setIsChecked(false);
            }
          }}
          onKeyPress={handleKeyPress}
          disabled={isChecked && isCorrect}
          className={`w-full px-6 py-4 text-4xl md:text-5xl font-black text-center rounded-2xl border-4 transition-all focus:outline-none ${
            isChecked
              ? isCorrect
                ? 'bg-green-100 border-green-400 text-green-700'
// @ARCH: DictationModeTab.UI.答案結果提示區
                : 'bg-red-100 border-red-400 text-red-700'
              : 'bg-white border-green-300 text-slate-700 focus:border-green-500 focus:ring-4 focus:ring-green-200'
          }`}
          placeholder="輸入單字..."
          autoFocus
        />
      </div>

      {/* 結果顯示 */}
      {isChecked && (
        <div className={`mb-6 p-6 rounded-2xl ${isCorrect ? 'bg-green-100 border-4 border-green-400' : 'bg-red-100 border-4 border-red-400'}`}>
          <div className="text-4xl mb-2 text-center">
            {isCorrect ? '🎉' : '😅'}
          </div>
          <div className={`text-3xl font-black text-center ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
            {isCorrect ? '答對了！' : '再試試看'}
{/* @ARCH: DictationModeTab.UI.功能操作按鈕組 */}
          </div>
          {!isCorrect && (
            <div className="text-2xl font-bold text-center text-slate-700 mt-2">
              正確答案是：<span className="text-green-600">{word}</span>
            </div>
          )}
        </div>
      )}

      {/* 操作按鈕 */}
      <div className="flex gap-4">
        {!isChecked || !isCorrect ? (
          <button
            onClick={handleCheck}
            disabled={!userInput.trim()}
            className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl font-bold text-xl transition-all active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ✓ 檢查答案
          </button>
        ) : null}
        {isChecked && (
          <button
            onClick={handleReset}
            className="px-6 py-3 bg-slate-200 hover:bg-slate-300 rounded-xl font-bold text-slate-700 transition-all active:scale-95"
          >
            🔄 重新開始
          </button>
        )}
        <button
          onClick={onPrevious}
          className="px-6 py-3 bg-slate-200 hover:bg-slate-300 rounded-xl font-bold text-slate-700 transition-all active:scale-95"
        >
          ← 上一個
        </button>
        <button
          onClick={onNext}
          className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl font-bold transition-all active:scale-95 shadow-lg"
        >
          下一個 →
        </button>
      </div>
    </div>
  );
};
// @ARCH:END DictationModeTab - UI: 聽寫模式

export default DictationModeTab;

