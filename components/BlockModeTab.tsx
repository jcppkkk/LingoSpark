import React, { useState, useEffect, useRef } from 'react';
import { Flashcard } from '../types';
import { speakWord } from '../services/speechService';
import { playCorrectSound } from '../services/soundService';

interface BlockModeTabProps {
  card: Flashcard;
  voice: SpeechSynthesisVoice | null;
  onNext: () => void;
  onPrevious: () => void;
  currentIndex: number;
  totalCards: number;
}

// @ARCH:START BlockModeTab - UI: 積木模式
const BlockModeTab: React.FC<BlockModeTabProps> = ({
  card,
  voice,
  onNext,
  onPrevious,
  currentIndex,
  totalCards
}) => {
// @ARCH: BlockModeTab.UX.遊戲狀態管理
  const [selectedLetters, setSelectedLetters] = useState<string[]>([]);
  const [shuffledLetters, setShuffledLetters] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const { word, definition } = card.data;
  
  // 用於追蹤是否已經播放過
  const lastWordRef = useRef<string>('');

// @ARCH: BlockModeTab.FEAT.字母初始化與打亂
  // 初始化：打散字母
  useEffect(() => {
    const letters = word.split('');
    // 隨機打散
    const shuffled = [...letters].sort(() => Math.random() - 0.5);
    setShuffledLetters(shuffled);
    setSelectedLetters([]);
    setIsComplete(false);
    setIsCorrect(false);
  }, [word, currentIndex]);
  
  // @ARCH: BlockModeTab - FEAT: 自動播放單字
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
// @ARCH: BlockModeTab.FEAT.字母選擇與答案檢查邏輯
  }, [word, voice, currentIndex]);

  const handleLetterClick = (letter: string, index: number) => {
    if (isComplete) return;

    // 從打散的字母中移除
    const newShuffled = [...shuffledLetters];
    newShuffled.splice(index, 1);
    setShuffledLetters(newShuffled);

    // 添加到選中的字母
    const newSelected = [...selectedLetters, letter];
    setSelectedLetters(newSelected);

    // 檢查是否完成
    if (newSelected.length === word.length) {
      setIsComplete(true);
      const userWord = newSelected.join('');
// @ARCH: BlockModeTab.FEAT.遊戲重置功能
      const isAnswerCorrect = userWord.toLowerCase() === word.toLowerCase();
      setIsCorrect(isAnswerCorrect);
      
      // 答對時播放音效
      if (isAnswerCorrect) {
        playCorrectSound();
      }
// @ARCH: BlockModeTab.FEAT.遊戲重置功能
    }
  };

  const handleReset = () => {
    const letters = word.split('');
    const shuffled = [...letters].sort(() => Math.random() - 0.5);
    setShuffledLetters(shuffled);
    setSelectedLetters([]);
// @ARCH: BlockModeTab.FEAT.手動單字發音
    setIsComplete(false);
    setIsCorrect(false);
// @ARCH: BlockModeTab.UI.進度指示器
  };

  const handleSpeak = async () => {
    if (isSpeaking) return;
    setIsSpeaking(true);
    try {
      await speakWord(word, voice || undefined);
    } catch (error) {
      console.error('語音播放失敗:', error);
    } finally {
      setIsSpeaking(false);
    }
// @ARCH: BlockModeTab.UI.進度指示器
  };

  return (
    <div className="flex flex-col h-full items-center justify-center p-4 md:p-8">
      {/* @ARCH: BlockModeTab.UI.中文提示與語音按鈕 */}
      {/* 進度指示 */}
      <div className="mb-4 text-sm font-bold text-slate-500">
        {currentIndex + 1} / {totalCards}
      </div>

      {/* 中文提示 */}
      <div className="text-center mb-6">
        <div className="text-4xl md:text-5xl font-black text-blue-600 mb-4">
          {definition}
        </div>
        
        {/* 語音按鈕 */}
        <button
          onClick={handleSpeak}
          disabled={isSpeaking}
// @ARCH: BlockModeTab.UI.已組單字顯示區
          className="w-16 h-16 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full flex items-center justify-center text-white text-3xl shadow-lg hover:scale-110 active:scale-95 transition-all disabled:opacity-50 mb-4"
        >
          🔊
        </button>
      </div>

      {/* 選中的字母（組成的單字） */}
      <div className="mb-8">
        <div className="text-2xl font-bold text-slate-600 mb-2">你組成的單字：</div>
        <div className="flex gap-2 justify-center min-h-[60px] items-center">
          {selectedLetters.map((letter, index) => (
            <div
              key={index}
              className="w-16 h-16 bg-gradient-to-r from-blue-400 to-cyan-500 text-white rounded-xl flex items-center justify-center text-3xl font-black shadow-lg animate-bounce-in"
            >
              {letter}
            </div>
          ))}
          {selectedLetters.length < word.length && (
            <div className="w-16 h-16 border-4 border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-400 text-2xl">
              {/* @ARCH: BlockModeTab.UI.打散字母選擇區 */}
              ?
            </div>
          )}
        </div>
      </div>

      {/* 打散的字母按鈕 */}
      <div className="mb-8">
        <div className="text-xl font-bold text-slate-600 mb-4">點擊字母重組單字：</div>
        <div className="flex flex-wrap gap-3 justify-center max-w-2xl">
          {shuffledLetters.map((letter, index) => (
            <button
              key={`${letter}-${index}`}
              onClick={() => handleLetterClick(letter, index)}
// @ARCH: BlockModeTab.UI.答題結果顯示
              className="w-16 h-16 bg-gradient-to-r from-purple-400 to-pink-500 hover:from-purple-500 hover:to-pink-600 text-white rounded-xl flex items-center justify-center text-3xl font-black shadow-lg hover:scale-110 active:scale-95 transition-all"
            >
              {letter}
            </button>
          ))}
        </div>
      </div>

      {/* 結果顯示 */}
      {isComplete && (
        <div className={`mb-6 p-6 rounded-2xl ${isCorrect ? 'bg-green-100 border-4 border-green-400' : 'bg-red-100 border-4 border-red-400'}`}>
          <div className="text-4xl mb-2 text-center">
            {isCorrect ? '🎉' : '😅'}
          </div>
          <div className={`text-3xl font-black text-center ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
            {isCorrect ? '答對了！' : '再試試看'}
{/* @ARCH: BlockModeTab.UI.導航與遊戲控制按鈕 */}
          </div>
          {!isCorrect && (
            <div className="text-2xl font-bold text-center text-slate-700 mt-2">
              正確答案是：<span className="text-blue-600">{word}</span>
            </div>
          )}
        </div>
      )}

      {/* 操作按鈕 */}
      <div className="flex gap-4">
        <button
          onClick={handleReset}
          className="px-6 py-3 bg-slate-200 hover:bg-slate-300 rounded-xl font-bold text-slate-700 transition-all active:scale-95"
        >
          🔄 重新開始
        </button>
        <button
          onClick={onPrevious}
          className="px-6 py-3 bg-slate-200 hover:bg-slate-300 rounded-xl font-bold text-slate-700 transition-all active:scale-95"
        >
          ← 上一個
        </button>
        <button
          onClick={onNext}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-xl font-bold transition-all active:scale-95 shadow-lg"
        >
          下一個 →
        </button>
      </div>
    </div>
  );
};
// @ARCH:END BlockModeTab - UI: 積木模式

export default BlockModeTab;

